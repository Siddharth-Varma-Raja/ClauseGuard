import datetime as dt
from pathlib import Path
import pytest, yaml
from rules_engine import ClauseInput, Engine, LeaseContext

CASES = yaml.safe_load((Path(__file__).parent / "cases.yaml").read_text(encoding="utf-8"))


@pytest.mark.parametrize("c", CASES, ids=[c["id"] for c in CASES])
def test_expected_verdict(c):
    engine = Engine(include_drafts=True)
    ctx = LeaseContext(**c.get("context", {}))
    result = engine.evaluate(ClauseInput(c["text"], c["topic"], c.get("confidence")), ctx)
    assert result.verdict.value == c["expect"], result.explanation


def test_drafts_are_ignored_by_default():
    r = Engine().evaluate(ClauseInput("A deposit of three months' rent.", "deposit"))
    assert r.verdict.value == "needs_review" and r.rule_id is None


def test_guidance_basis_gives_amber_not_red():
    engine = Engine(include_drafts=True)
    engine.rules = [{**r, "basis": "guidance"} if r["id"] == "DEP-001" else r for r in engine.rules]
    r = engine.evaluate(ClauseInput("A deposit of three months' rent.", "deposit"))
    assert r.verdict.value == "against_guidance" and r.to_dict()["uiStatus"] == "amber"


def test_law_version_picks_rule_by_tenancy_start():
    rule = {"id": "X", "topic": "deposit", "status": "verified", "basis": "law", "applies_from": "2026-03-01",
            "check": {"type": "deposit_max_months", "max_months": 1}, "explain_fail_law": "bad {months}",
            "explain_ok": "ok", "explain_unsure": "{reason}"}
    e = Engine(rules=[rule], law_version="2026-03-01")
    clause = ClauseInput("A deposit of three months' rent.", "deposit")
    assert e.evaluate(clause, LeaseContext(tenancy_start=dt.date(2026, 5, 1))).verdict.value == "breaks_law"
    assert e.evaluate(clause, LeaseContext(tenancy_start=dt.date(2025, 5, 1))).verdict.value == "needs_review"
    assert e.evaluate(clause).verdict.value == "needs_review"  # unknown start date: do not guess
