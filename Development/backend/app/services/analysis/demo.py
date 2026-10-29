"""Demo analysis service: lease text -> clauses -> topic -> rule engine -> frontend shape.

Pipeline (all pure Python, no database, no S3, no GPU):

    split_clean()            language_stream/split.py    split the text into clauses
    baseline.predict()       language_stream/baseline.py keyword stand-in for the trained classifier
    Engine.evaluate()        rules_engine/               check the clause against the written rules
    -> dict shaped like the frontend `Analysis` type (Development/frontend/lib/types.ts)

The keyword baseline is a STAND-IN. To use the trained classifier later, replace `classify()` only.
All rules are still `draft`, so results are labelled as such in the `sources` and `reason` fields.
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any

from language_stream.baseline import predict
from language_stream.split import split_clean
from rules_engine import ClauseInput, Engine, LeaseContext

CLASSIFIER_NAME = "keyword-baseline-v0"

# Classifier topic -> topic name used by rules in rules_engine/rules/rules.yaml
RULE_TOPIC = {"deposit": "deposit", "termination": "termination", "access": "access",
              "rent_review": "rent_review"}

# The keyword baseline is weak (it counts the word "notice" in almost every clause), so each rule
# topic can ALSO be reached by its own trigger words. A clause may therefore be checked against
# more than one rule topic; the most serious result wins.
TRIGGERS = {
    "deposit": re.compile(r"\bdeposit\b", re.I),
    "access": re.compile(r"\b(?:enter|entry|inspect|inspection)\b", re.I),
    "termination": re.compile(r"\b(?:terminat\w*|end the tenancy|ending the tenancy)\b", re.I),
        "rent_review": re.compile(
        r"\brent\b[^.]{0,60}\b(?:review|reviewed|revised|revision|increase|increased)\b"
        r"|\b(?:review|revise|revision|increase)\w*\b[^.]{0,40}\brent\b", re.I),
}
SEVERITY = {"breaks_law": 3, "against_guidance": 2, "needs_review": 1, "looks_fine": 0}


def rule_topics(text: str, classifier_topic: str) -> list[str]:
    topics = []
    if classifier_topic in RULE_TOPIC:
        topics.append(RULE_TOPIC[classifier_topic])
    topics += [t for t, rx in TRIGGERS.items() if rx.search(text) and t not in topics]
    return topics

TITLES = {
    "deposit": "Deposit", "notice_period": "Notice period", "rent_review": "Rent review",
    "termination": "Termination", "repairs": "Repairs", "access": "Landlord access",
    "fees": "Fees and charges", "waiver": "Waiver", "other": "General clause",
}

_engine: Engine | None = None


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        # include_drafts=True: every rule is still `draft` (not legally verified). Demo only.
        _engine = Engine(include_drafts=True)
    return _engine


def classify(text: str) -> tuple[str, str]:
    """Return (topic, classifier_name). Swap this function for the trained model later."""
    return predict(text), CLASSIFIER_NAME


# ---- lease-level facts (optional; None when not found) -------------------------------------
_EURO = r"€\s?([\d,]+(?:\.\d{1,2})?)"
_RENT = re.compile(r"\brent\b[^€\n]{0,60}" + _EURO + r"[^\n]{0,30}?(?:per month|monthly|a month|each month|/\s?month)", re.I)
_DEPOSIT = re.compile(r"\bdeposit\b[^€\n]{0,60}" + _EURO, re.I)


def _cents(match: re.Match | None) -> int | None:
    if not match:
        return None
    return round(float(match.group(1).replace(",", "")) * 100)


def lease_facts(text: str) -> dict[str, int | None]:
    return {"monthly_rent_cents": _cents(_RENT.search(text)), "deposit_cents": _cents(_DEPOSIT.search(text))}


# ---- clause conversion ---------------------------------------------------------------------
_NUMBER = re.compile(r"^\s*(?:clause\s+)?(\d+(?:\.\d+)*)", re.I)


def _number(text: str, idx: int) -> str:
    m = _NUMBER.match(text)
    return m.group(1) if m else str(idx + 1)


def _sources(citation: dict | None, basis: str | None, status: str | None) -> list[dict[str, Any]]:
    if not citation:
        return []
    notes = []
    if citation.get("section") in (None, "TO VERIFY"):
        notes.append("Section number still to be verified")
    if status != "verified":
        notes.append("Draft rule: not yet checked by a legal reviewer")
    return [{
        "kind": "RTB guidance" if basis == "guidance" else "Law",
        "title": f"{citation.get('name', 'Source')} ({citation.get('act', '')})".replace(" ()", ""),
        "url": citation.get("url"),
        "note": "; ".join(notes) or None,
    }]


def _clause_to_dict(clause, ctx: LeaseContext) -> dict[str, Any]:
    topic, classifier = classify(clause.text)
    base = {
        "id": f"c{clause.idx}",
        "number": _number(clause.text, clause.idx),
        "text": clause.text,
        "page": clause.page or 1,
        "confidence": "low",   # keyword baseline: never claim more
        "reviewed": False,
    }

    # Run every rule topic that applies and keep the most serious verdict that came from a real rule.
    best, best_topic = None, None
    for rt in rule_topics(clause.text, topic):
        res = get_engine().evaluate(ClauseInput(text=clause.text, topic=rt), ctx).to_dict()
        if res["rule_id"] is None:      # no rule covered this topic
            continue
        if best is None or SEVERITY[res["verdict"]] > SEVERITY[best["verdict"]]:
            best, best_topic = res, rt

    if best is None:
        title = TITLES.get(topic, topic.title())
        return {**base, "title": title, "status": "grey",
                "explanation": f"This looks like a '{title.lower()}' clause. We do not have a checked rule for this topic yet, so it has not been assessed.",
                "reason": f"Topic guessed by {classifier}. No rule for this topic.",
                "nextSteps": [], "sources": []}

    return {**base, "title": TITLES.get(best_topic, best_topic.title()), "status": best["uiStatus"],
            "explanation": best["explanation"],
            "reason": f"Rule {best['rule_id']} ({best['basis']}, {best['rule_status']}). Topic guessed by {classifier}.",
            "nextSteps": best["next_steps"],
            "sources": _sources(best["citation"], best["basis"], best["rule_status"])}


def analyse_text(text: str, file_name: str = "lease") -> dict[str, Any]:
    """Run the whole demo pipeline on redacted lease text. Returns the frontend `Analysis` shape."""
    facts = lease_facts(text)
    ctx = LeaseContext(monthly_rent_cents=facts["monthly_rent_cents"])
    pages = text.split("\f") if "\f" in text else [text]
    clauses = [_clause_to_dict(c, ctx) for c in split_clean(pages, "demo")]

    counts = {"red": 0, "amber": 0, "green": 0, "grey": 0}
    for c in clauses:
        counts[c["status"]] += 1

    return {
        "id": str(uuid.uuid4()),
        "fileName": file_name,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "propertyAddress": None,
        "counts": counts,
        "monthlyRentCents": facts["monthly_rent_cents"],
        "depositCents": facts["deposit_cents"],
        "tenancyStart": None,
        "termMonths": None,
        "pageCount": len(pages),
        "clauses": clauses,
        # extra fields the frontend can ignore; useful for the demo and the docs
        "engine": {"classifier": CLASSIFIER_NAME, "rulesStatus": "draft", "lawVersion": get_engine().law_version},
    }
