KEYWORDS = {
    "deposit": ["deposit", "security"],
    "notice_period": ["notice", "notify"],
    "rent_review": ["rent review", "review of the rent", "increase the rent", "rent increase", "rent pressure"],
    "termination": ["terminat", "expire", "forfeit", "re-enter", "ejectment"],
    "repairs": ["repair", "maintain", "maintenance", "defect", "good order", "tenantable"],
    "access": ["enter the", "entry", "access", "inspect", "viewing"],
    "fees": ["fee", "charge", "expenses", "costs", "administration"],
    "waiver": ["waive", "waiver", "no failure"],
}


def predict(text):
    """Guess the category by counting trigger words; 'other' if none match."""
    t = text.lower()
    scores = {c: sum(t.count(k) for k in kws) for c, kws in KEYWORDS.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "other"