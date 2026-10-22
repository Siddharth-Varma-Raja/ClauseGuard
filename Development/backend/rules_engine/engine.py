"""ClauseGuard rule engine.

Input : one clause (text + topic from the classifier) and optional lease facts.
Output: a RuleResult with a verdict, the rule that fired, a plain-English reason and a citation.
Rules live in rules/rules.yaml so non-coders can read and review them.
"""
from __future__ import annotations
import datetime as dt
from dataclasses import asdict, dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any

import yaml

from . import extract

DISCLAIMER = (
    "ClauseGuard is an educational project and does not give legal advice. It checks leases against "
    "published RTB guidance and Irish tenancy law as we understand them, and it may be wrong or out of date. "
    "For advice about your own situation, contact the RTB, Threshold or a solicitor."
)
RULES_FILE = Path(__file__).parent / "rules" / "rules.yaml"
MIN_CONFIDENCE = 0.6  # classifier confidence below this means "needs review"


class Verdict(str, Enum):
    BREAKS_LAW = "breaks_law"
    AGAINST_GUIDANCE = "against_guidance"
    NEEDS_REVIEW = "needs_review"
    LOOKS_FINE = "looks_fine"


_SEVERITY = {Verdict.BREAKS_LAW: 3, Verdict.AGAINST_GUIDANCE: 2, Verdict.NEEDS_REVIEW: 1, Verdict.LOOKS_FINE: 0}
# Colour the frontend shows for each verdict.
UI_STATUS = {
    Verdict.BREAKS_LAW: "red", Verdict.AGAINST_GUIDANCE: "amber",
    Verdict.NEEDS_REVIEW: "grey", Verdict.LOOKS_FINE: "green",
}


@dataclass
class ClauseInput:
    text: str
    topic: str                                # from the classifier, e.g. "deposit"
    classifier_confidence: float | None = None


@dataclass
class LeaseContext:
    monthly_rent_cents: int | None = None
    tenancy_start: dt.date | None = None      # decides which version of the law applies
    tenancy_months: int | None = None         # length of the tenancy so far (for notice periods)


@dataclass
class RuleResult:
    verdict: Verdict
    rule_id: str | None
    basis: str | None                         # "law" or "guidance" (None when no rule fired)
    rule_status: str | None                   # "verified" or "draft"
    explanation: str
    next_steps: list[str] = field(default_factory=list)
    citation: dict[str, Any] | None = None
    law_version: str | None = None
    extracted: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["verdict"] = self.verdict.value
        d["uiStatus"] = UI_STATUS[self.verdict]
        return d


class _Safe(dict):
    def __missing__(self, key):  # leave unknown {placeholders} visible instead of crashing
        return "{" + key + "}"


def _fmt(template: str, values: dict) -> str:
    shown = {k: (f"{v:g}" if isinstance(v, float) else v) for k, v in values.items()}
    return (template or "").format_map(_Safe(shown))


# ---- checks: each returns (outcome, extracted values, reason). outcome: "fail" | "ok" | "unsure"
def _check_deposit(clause, ctx, p):
    months = extract.months_of_rent_after(clause.text, "deposit")
    cents = extract.money_cents_after(clause.text, "deposit")
    if months is None and cents is not None and ctx.monthly_rent_cents:
        months = cents / ctx.monthly_rent_cents
    ex = {"months": None if months is None else round(months, 2), "deposit_cents": cents,
          "limit_months": p["max_months"]}
    if months is None:
        return "unsure", ex, "We could not work out the deposit or the monthly rent."
    return ("fail" if months > p["max_months"] + 1e-9 else "ok"), ex, None


def _check_entry(clause, ctx, p):
    if extract.entry_without_notice(clause.text):
        return "fail", {}, None
    hours = extract.notice_hours(clause.text)
    return "unsure", {"notice_hours": hours}, (
        "The clause gives some notice, but we cannot confirm it is reasonable." if hours
        else "We could not tell whether the landlord must give notice before entering.")


def _check_termination(clause, ctx, p):
    table = p.get("table") or []
    if not table:
        return "unsure", {}, "The notice-period table has not been filled in from the statute yet."
    days = extract.notice_days(clause.text)
    if days is None or ctx.tenancy_months is None:
        return "unsure", {"notice_days": days}, "We need both the notice length and how long the tenancy has run."
    required = next((r["days"] for r in table
                     if r["min_months"] <= ctx.tenancy_months < r.get("max_months", float("inf"))), None)
    ex = {"notice_days": days, "required_days": required}
    if required is None:
        return "unsure", ex, "No notice period in the table covers this tenancy length."
    return ("fail" if days < required else "ok"), ex, None


CHECKS = {"deposit_max_months": _check_deposit, "entry_without_notice": _check_entry,
          "termination_notice_days": _check_termination}


class Engine:
    def __init__(self, rules: list[dict] | None = None, law_version: str | None = None,
                 include_drafts: bool = False, rules_file: Path = RULES_FILE):
        if rules is None:
            data = yaml.safe_load(Path(rules_file).read_text(encoding="utf-8"))
            rules, law_version = data["rules"], data.get("law_version")
        self.rules, self.law_version, self.include_drafts = rules, law_version, include_drafts

    def _applies(self, rule, ctx):
        """True / False, or None when the rule is date-bound and we do not know the tenancy start."""
        lo, hi = rule.get("applies_from"), rule.get("applies_to")
        if not lo and not hi:
            return True
        if ctx.tenancy_start is None:
            return None
        return (not lo or ctx.tenancy_start >= dt.date.fromisoformat(str(lo))) and \
               (not hi or ctx.tenancy_start <= dt.date.fromisoformat(str(hi)))

    def _run(self, rule, clause, ctx) -> RuleResult:
        base = dict(rule_id=rule["id"], basis=rule["basis"], rule_status=rule["status"],
                    citation=rule.get("citation"), law_version=self.law_version)
        applies = self._applies(rule, ctx)
        if applies is False:
            return None
        if applies is None:
            return RuleResult(Verdict.NEEDS_REVIEW, explanation=_fmt(rule["explain_unsure"], {}),
                              extracted={"reason": "tenancy start date needed to pick the right law version"}, **base)
        outcome, ex, reason = CHECKS[rule["check"]["type"]](clause, ctx, rule["check"])
        if outcome == "fail":
            verdict = Verdict.BREAKS_LAW if rule["basis"] == "law" else Verdict.AGAINST_GUIDANCE
            key = "explain_fail_law" if rule["basis"] == "law" else "explain_fail_guidance"
            return RuleResult(verdict, explanation=_fmt(rule[key], ex),
                              next_steps=rule.get("next_steps", []), extracted=ex, **base)
        if outcome == "ok":
            return RuleResult(Verdict.LOOKS_FINE, explanation=_fmt(rule["explain_ok"], ex), extracted=ex, **base)
        ex = {**ex, "reason": reason}
        return RuleResult(Verdict.NEEDS_REVIEW, explanation=_fmt(rule["explain_unsure"], ex),
                          next_steps=rule.get("next_steps", []), extracted=ex, **base)

    def evaluate(self, clause: ClauseInput, ctx: LeaseContext | None = None) -> RuleResult:
        ctx = ctx or LeaseContext()
        unsure = lambda why: RuleResult(Verdict.NEEDS_REVIEW, None, None, None,
                                        f"We are not sure about this clause. {why}", law_version=self.law_version)
        if clause.classifier_confidence is not None and clause.classifier_confidence < MIN_CONFIDENCE:
            return unsure("We could not tell what this clause is about with enough confidence.")
        usable = [r for r in self.rules if r["topic"] == clause.topic
                  and (r["status"] == "verified" or self.include_drafts)]
        if not usable:
            return unsure("No checked rule covers this topic yet.")
        results = [r for r in (self._run(rule, clause, ctx) for rule in usable) if r]
        if not results:
            return unsure("No rule applies to this tenancy start date.")
        return max(results, key=lambda r: _SEVERITY[r.verdict])
