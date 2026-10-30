import json
from types import SimpleNamespace as NS

from app.services.analysis.lease_chat import build_findings, build_prompt, fallback_answer


def _clause(number, title, risk, plain="", reason="", steps=None, sources=None):
    return NS(clause_number=number, clause_title=title, risk_level=risk, plain_english=plain,
              flagging_reason=reason, suggested_steps=json.dumps(steps) if steps else None,
              sources=[NS(source_name=s) for s in (sources or [])])


def _review(clauses, red=0, amber=0, green=0, grey=0):
    return NS(clauses=clauses, total_clauses=len(clauses), likely_unenforceable_count=red,
              needs_review_count=amber, compliant_count=green, informational_count=grey)


DEPOSIT = _clause(2, "Deposit", "needs_review", plain="The deposit is about 2 months' rent.",
                  reason="Rule DEP-001 (guidance, draft).", steps=["Ask for one month's rent."],
                  sources=["RTB: Security deposits"])
TIDY = _clause(4, "General clause", "informational")


def test_findings_include_flagged_clause_and_skip_unflagged():
    text = build_findings(_review([DEPOSIT, TIDY], amber=1, grey=1))
    assert "Clause 2 - Deposit [AMBER (worth checking)]" in text
    assert "about 2 months" in text
    assert "Ask for one month's rent." in text
    assert "RTB: Security deposits" in text
    assert "Clause 4" not in text
    assert "1 clause was not checked" in text


def test_prompt_contains_question_and_no_raw_clause_text():
    c = _clause(3, "Landlord access", "needs_review", plain="No notice before entry.")
    c.clause_text = "SECRET RAW TEXT"
    prompt = build_prompt(_review([c], amber=1), "What is wrong?")
    assert "TENANT QUESTION: What is wrong?" in prompt
    assert "SECRET RAW TEXT" not in prompt


def test_nothing_flagged():
    text = build_findings(_review([TIDY], grey=1))
    assert "No clause was flagged." in text
    assert "did not flag any clause" in fallback_answer(_review([TIDY], grey=1))


def test_fallback_lists_flagged_clauses_and_says_it_is_not_a_full_review():
    answer = fallback_answer(_review([DEPOSIT, TIDY], amber=1, grey=1))
    assert "flagged 1 clause worth checking" in answer
    assert "Clause 2 (Deposit)" in answer
    assert "not a full review" in answer
    assert "not legal advice" in answer


import asyncio

from app.services.analysis.lease_chat import SYSTEM_INSTRUCTION, answer_question


def test_answer_uses_model_and_sends_results():
    seen = {}

    async def fake_model(system, turns):
        seen["system"], seen["turns"] = system, turns
        return "  Your deposit is too high.  "

    review = _review([DEPOSIT], amber=1)
    history = [{"role": "user", "text": "hi"}, {"role": "assistant", "text": "hello"}]
    out = asyncio.run(answer_question(review, "What is wrong?", fake_model, history))
    assert out == "Your deposit is too high."
    assert seen["system"] == SYSTEM_INSTRUCTION
    assert seen["turns"][0] == ("user", "hi") and seen["turns"][1] == ("model", "hello")
    assert "Clause 2 - Deposit" in seen["turns"][-1][1]


def test_answer_falls_back_when_model_fails_or_is_empty():
    async def broken(system, turns):
        raise RuntimeError("down")

    async def empty(system, turns):
        return ""

    review = _review([DEPOSIT, TIDY], amber=1, grey=1)
    for model in (broken, empty):
        out = asyncio.run(answer_question(review, "What is wrong?", model))
        assert "flagged 1 clause worth checking" in out


def test_blank_question_gets_the_saved_summary_without_calling_the_model():
    async def must_not_run(system, turns):
        raise AssertionError("model called")

    out = asyncio.run(answer_question(_review([DEPOSIT], amber=1), "   ", must_not_run))
    assert "Clause 2 (Deposit)" in out


def test_worst_clauses_come_first_and_fine_clauses_are_listed():
    red = _clause(7, "Termination", "likely_unenforceable", plain="Notice is too short.")
    fine = _clause(1, "Deposit", "compliant", plain="The deposit is within the one-month limit.")
    text = build_findings(_review([fine, DEPOSIT, red], red=1, amber=1, green=1))
    assert text.index("Clause 7 - Termination") < text.index("Clause 2 - Deposit")
    assert "Checked and looks fine:" in text
    assert "Clause 1 - Deposit: The deposit is within the one-month limit." in text
