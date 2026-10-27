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