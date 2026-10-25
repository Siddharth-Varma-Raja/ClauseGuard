# ClauseGuard rule engine

Checks one lease clause against a short list of written rules and returns a verdict, the rule that fired, a plain-English reason and a citation. The rules are data (`rules/rules.yaml`), not code, so they can be read and reviewed by people who do not program.

> **Draft status.** Every rule currently has `status: draft`: it has NOT been checked against the statute. The engine ignores drafts unless run with `include_drafts=True` (prototype and demo only). A rule becomes `verified` only when a second person has checked it and filled in `citation.verified_on` and `citation.verified_by`.

## Input and output (the contract for frontend and backend)

```python
from rules_engine import Engine, ClauseInput, LeaseContext
result = Engine().evaluate(
    ClauseInput(text="...", topic="deposit", classifier_confidence=0.91),   # from the classifier
    LeaseContext(monthly_rent_cents=180000, tenancy_start=date(2026, 5, 1), tenancy_months=8),  # all optional
)
result.to_dict()
```

```json
{
  "verdict": "breaks_law",
  "uiStatus": "red",
  "rule_id": "DEP-001",
  "basis": "law",
  "rule_status": "draft",
  "explanation": "A landlord cannot ask for a deposit of more than one month's rent. This clause asks for about 2 months.",
  "next_steps": ["Ask the landlord to reduce the deposit to one month's rent before you sign."],
  "citation": {"name": "RTB: Security deposits", "act": "...", "section": "TO VERIFY", "url": "https://rtb.ie/...", "verified_on": null, "verified_by": null},
  "law_version": "2026-03-01",
  "extracted": {"months": 2, "deposit_cents": 360000, "limit_months": 1}
}
```

| verdict | basis | colour | Meaning for the user |
|---|---|---|---|
| `breaks_law` | law | red | The clause is not allowed |
| `against_guidance` | guidance | amber | The RTB advises against it, but it is not a legal rule |
| `needs_review` | any | grey | We are not sure. No guess is made |
| `looks_fine` | any | green | Within the limit we checked |

The interface must show the law versus guidance difference in words, not only in colour. Suggested API change: add `verdict`, `basis`, `ruleId` and `lawVersion` to each clause instead of overloading `risk_level`.

## When the answer is "needs review"

The engine never guesses. It answers `needs_review` when: no verified rule covers the topic; the classifier confidence is below 0.6; a number could not be extracted (deposit amount, rent, notice length); the rule depends on the tenancy start date and none was given; or a rule's data (such as the notice table) is not filled in.

## Law version

Some rules differ for tenancies created on or after 1 March 2026. Each rule can carry `applies_from` and `applies_to` (tenancy start dates). The file's `law_version` is returned with every result. Update plan: re-check every rule monthly and after any new Act or RTB change, then set `last_legal_review`.

## Adding or changing a rule

1. Copy an entry in `rules/rules.yaml`, give it a new `id`, keep `status: draft`.
2. Cite the Act section and RTB page. Quote the exact section number from the statute text.
3. Someone other than the author adds test cases to `tests/cases.yaml` (expected verdicts written from the law, not from the rule).
4. A reviewer checks the rule against the statute, fills in `verified_on` and `verified_by`, and sets `status: verified`.
5. `python -m pytest rules_engine` must pass before merging.

## Using it in the FastAPI backend

```python
engine = Engine()   # verified rules only; Engine(include_drafts=True) for the prototype demo

for clause in clauses:   # output of the classifier
    res = engine.evaluate(ClauseInput(clause.text, clause.topic, clause.confidence), ctx).to_dict()
```

## Known limits

Number extraction is English-only and rule-based (first match near the key word). Phrases such as "first month's rent plus a deposit of two months" can confuse it, and then the safe answer is `needs_review`. Termination notice periods (TERM-001) are not filled in: the table must be copied from the statute, and tenancies from 1 March 2026 need a separate rule. Entry (ENTRY-001) never answers `looks_fine`, because the engine cannot judge whether a stated notice period is reasonable.

## Disclaimer (use this exact wording in the app, README and slides)

> ClauseGuard is an educational project and does not give legal advice. It checks leases against published RTB guidance and Irish tenancy law as we understand them, and it may be wrong or out of date. For advice about your own situation, contact the RTB, Threshold or a solicitor.
