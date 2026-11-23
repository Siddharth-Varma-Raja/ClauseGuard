from language_stream.action_list import prioritise


def item(clause, quote):
    return {"clause": clause, "quote": quote}


def test_money_deadline_and_consequence_beat_routine_duties():
    al = {
        "tenant_must": [
            item("1", "The Tenant shall keep the interior clean and tidy."),
            item("2", "The Tenant shall pay a deposit of €3,000 on signing."),
        ],
        "not_allowed": [item("3", "The Tenant shall not sublet the property.")],
        "unpaid_rent": [item("4", "The Landlord may terminate the tenancy if rent is late by giving 14 days' notice.")],
    }
    top = prioritise(al, limit=3)
    clauses = [t["clause"] for t in top]
    assert "1" not in clauses and set(clauses) == {"2", "3", "4"}


def test_same_sentence_in_two_groups_appears_once_with_the_stronger_label():
    q = "The Tenant shall pay a deposit of €3,000 on signing."
    top = prioritise({"tenant_must": [item("2", q)], "charges": [item("2", q)]})
    assert len(top) == 1 and top[0]["group"] == "charges"


def test_empty_or_missing_list():
    assert prioritise(None) == [] and prioritise({}) == []
