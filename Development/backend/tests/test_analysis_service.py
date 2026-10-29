from app.services.analysis.demo import analyse_text

LEASE = """1. The monthly rent is €1,800 per month payable in advance.

2. The Tenant shall pay a deposit of €3,600 on signing.

3. The Landlord may enter the property at any time without prior notice.

4. The Tenant shall keep the property clean and tidy.
"""


def test_service_flags_deposit_and_entry():
    r = analyse_text(LEASE)
    status_by_title = {c["title"]: c["status"] for c in r["clauses"]}
    assert status_by_title["Deposit"] == "amber"
    assert status_by_title["Landlord access"] == "amber"
    assert r["counts"]["red"] == 0          # draft guidance never claims "breaks the law"
    assert r["engine"]["rulesStatus"] == "draft"


def test_unknown_topic_is_grey_not_green():
    r = analyse_text("The Tenant shall keep the property clean and tidy.")
    assert r["clauses"][0]["status"] == "grey"


def test_emergency_entry_is_not_flagged():
    r = analyse_text("The Landlord may enter the property without notice in an emergency.")
    assert r["clauses"][0]["status"] != "amber"

def test_reason_shows_matched_phrase():
    r = analyse_text("The Landlord may enter the property at any time without prior notice.")
    reason = r["clauses"][0]["reason"]
    assert "Matched:" in reason
    assert "without prior notice" in reason


def test_forfeiture_clause_is_not_flagged_as_entry():
    # Real-world wording: "at any time" is about rent in arrears, "enter" is re-entry after default.
    text = (
        "It is hereby agreed that if the rent reserved shall at any time be in arrears "
        "for fourteen days, or if the Tenant shall be in breach of any covenant, "
        "it shall be lawful for the Landlord to enter upon the demised premises "
        "and hold the same as if this Agreement had not been made."
    )
    r = analyse_text(text)
    assert r["clauses"][0]["status"] != "amber"


def test_six_monthly_rent_review_is_flagged():
    r = analyse_text("The Landlord may review the rent every six months.")
    c = r["clauses"][0]
    assert c["title"] == "Rent review"
    assert c["status"] == "amber"


def test_annual_rent_review_is_fine():
    r = analyse_text("The rent may be reviewed once every 12 months.")
    c = r["clauses"][0]
    assert c["title"] == "Rent review"
    assert c["status"] == "green"


def test_unclear_rent_review_is_grey():
    r = analyse_text("The rent may be reviewed from time to time.")
    assert r["clauses"][0]["status"] == "grey"