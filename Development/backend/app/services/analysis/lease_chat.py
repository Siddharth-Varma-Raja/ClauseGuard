"""Lease chat: answer "what is wrong in my lease?" from the saved analysis, not from guesswork.

The rule engine decides what is wrong. This module only turns the saved results into
(1) a short findings text for the language model and (2) a safe fallback answer that needs no model.
Whole clauses are never sent to the model: only ClauseGuard's own explanations, plus the short evidence
quote (a few words of the redacted clause) that the rule engine attaches to each flag.
"""
from __future__ import annotations

import json

FLAGGED = ("likely_unenforceable", "needs_review")
LABEL = {
    "likely_unenforceable": "RED (likely unenforceable)",
    "needs_review": "AMBER (worth checking)",
    "compliant": "GREEN (looks fine)",
    "informational": "GREY (not checked)",
}

SYSTEM_INSTRUCTION = (
    "You are the ClauseGuard assistant. You help a tenant understand the results of an automated "
    "check of their Irish residential lease. Answer ONLY from the CHECK RESULTS provided. "
    "Use short, simple, plain English. Refer to clauses by number and title. "
    "Say what the problem is, why it matters, and what the tenant can do, using the wording in the results. "
    "Do not state any law, number or rule that is not in the results. "
    "If the answer is not in the results, say you cannot tell from the check and suggest the RTB, "
    "Threshold or a solicitor. Say when a result is only a draft rule or guidance and not a firm legal conclusion. "
    "Return plain text only. Do not give legal advice."
)


def _risk(clause) -> str:
    risk = clause.risk_level
    return risk.value if hasattr(risk, "value") else str(risk)


def _steps(clause) -> list[str]:
    raw = getattr(clause, "suggested_steps", None)
    if not raw:
        return []
    try:
        steps = json.loads(raw)
    except (TypeError, ValueError):
        return [str(raw)]
    return [str(s) for s in steps] if isinstance(steps, list) else [str(steps)]


def flagged_clauses(review) -> list:
    """Flagged clauses, most serious first (red before amber), then by clause number."""
    flagged = [c for c in review.clauses if _risk(c) in FLAGGED]
    return sorted(flagged, key=lambda c: (_risk(c) != "likely_unenforceable", c.clause_number))


def fine_clauses(review) -> list:
    return [c for c in review.clauses if _risk(c) == "compliant"]


def _not_checked(review) -> int:
    return review.informational_count


def _clauses_word(n: int) -> str:
    return "clause was" if n == 1 else "clauses were"


def build_findings(review) -> str:
    """The saved results as plain text for the model."""
    lines = [
        f"Clauses in the lease: {review.total_clauses}. "
        f"Red: {review.likely_unenforceable_count}. Amber: {review.needs_review_count}. "
        f"Green: {review.compliant_count}. Grey (not checked): {review.informational_count}.",
    ]
    flagged = flagged_clauses(review)
    if not flagged:
        lines.append("No clause was flagged.")
    for c in flagged:
        lines.append("")
        lines.append(f"Clause {c.clause_number} - {c.clause_title} [{LABEL[_risk(c)]}]")
        if c.plain_english:
            lines.append(f"What it means: {c.plain_english}")
        if c.flagging_reason:
            lines.append(f"Why it was flagged: {c.flagging_reason}")
        for step in _steps(c):
            lines.append(f"What the tenant can do: {step}")
        sources = [s.source_name for s in (getattr(c, "sources", None) or []) if getattr(s, "source_name", None)]
        if sources:
            lines.append("Source: " + "; ".join(sources))
    fine = fine_clauses(review)
    if fine:
        lines.append("")
        lines.append("Checked and looks fine:")
        for c in fine:
            lines.append(f"- Clause {c.clause_number} - {c.clause_title}: {c.plain_english or 'no problem found.'}")
    if _not_checked(review):
        lines.append("")
        lines.append(
            f"{_not_checked(review)} {_clauses_word(_not_checked(review))} not checked, because no checked rule covers their topic yet."
        )
    return "\n".join(lines)


def build_prompt(review, question: str) -> str:
    return f"CHECK RESULTS:\n{build_findings(review)}\n\nTENANT QUESTION: {question}"


def fallback_answer(review) -> str:
    """Used when the language model is unavailable. Built only from the saved results."""
    flagged = flagged_clauses(review)
    parts = []
    if not flagged:
        parts.append("ClauseGuard did not flag any clause in this lease.")
    else:
        n = len(flagged)
        parts.append(f"ClauseGuard flagged {n} clause{'s' if n != 1 else ''} worth checking:")
        for c in flagged:
            line = f"- Clause {c.clause_number} ({c.clause_title}): {c.plain_english or c.flagging_reason or 'please check this clause.'}"
            steps = _steps(c)
            if steps:
                line += f" What you can do: {steps[0]}"
            parts.append(line)
    if _not_checked(review):
        parts.append(
            f"{_not_checked(review)} {_clauses_word(_not_checked(review))} not checked because ClauseGuard has no checked rule for their topic yet, "
            "so this is not a full review."
        )
    parts.append(
        "This is an automated check, not legal advice. For help with your own situation contact the RTB, Threshold or a solicitor."
    )
    return "\n".join(parts)


MAX_QUESTION_CHARS = 1000
MAX_HISTORY_TURNS = 6


async def answer_question(review, question: str, ask_model, history: list[dict] | None = None) -> str:
    """Answer a tenant's question about the whole lease.

    ask_model(system_instruction, turns) is an async function that returns the model's text; turns is a
    list of (role, text) with role "user" or "model". If it fails or returns nothing, the answer is built
    from the saved results alone.
    """
    question = (question or "").strip()[:MAX_QUESTION_CHARS]
    if not question:
        return fallback_answer(review)
    turns: list[tuple[str, str]] = []
    for item in (history or [])[-MAX_HISTORY_TURNS:]:
        text = str(item.get("text") or item.get("content") or "").strip()[:MAX_QUESTION_CHARS]
        if text:
            role = "model" if item.get("role") in ("assistant", "model") else "user"
            turns.append((role, text))
    turns.append(("user", build_prompt(review, question)))
    try:
        reply = (await ask_model(SYSTEM_INSTRUCTION, turns) or "").strip()
    except Exception:
        reply = ""
    return reply or fallback_answer(review)
