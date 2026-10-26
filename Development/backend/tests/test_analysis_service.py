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
