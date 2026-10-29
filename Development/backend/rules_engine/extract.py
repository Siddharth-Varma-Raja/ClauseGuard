"""Pull numbers out of clause text. Every function returns None when it is not sure.

Rules treat None as "unsure" and answer needs_review, so a missed number is never a guess.
Limits (known): English only, simple phrasing, first match near the key word wins.
"""
from __future__ import annotations
import re

WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8,
    "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "fourteen": 14, "twenty": 20,
    "twenty-one": 21, "twenty-eight": 28, "thirty": 30,
}
_NUM = r"(\d+(?:\.\d+)?|" + "|".join(sorted(WORDS, key=len, reverse=True)) + r")"


def _to_number(token: str) -> float:
    t = token.lower()
    return float(WORDS[t]) if t in WORDS else float(t)


def money_cents_after(text: str, keyword: str) -> int | None:
    """First euro amount at or after `keyword` (for example 'deposit'). Returns euro cents."""
    i = text.lower().find(keyword.lower())
    if i < 0:
        return None
    m = re.search(r"(?:€|EUR\s?)\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?", text[i:], re.I)
    if not m:
        return None
    euros = int(m.group(1).replace(",", ""))
    cents = int((m.group(2) or "0").ljust(2, "0"))
    return euros * 100 + cents


def months_of_rent_after(text: str, keyword: str) -> float | None:
    """'two months' rent' style phrase at or after `keyword`."""
    i = text.lower().find(keyword.lower())
    if i < 0:
        return None
    m = re.search(_NUM + r"\s*(?:\(\d+\)\s*)?months?[’']?s?[’']?\s*(?:of\s+)?(?:the\s+)?rent", text[i:], re.I)
    return _to_number(m.group(1)) if m else None


def notice_days(text: str) -> float | None:
    """Notice length in days, from phrases like '28 days', 'two weeks' or '3 months' notice."""
    m = re.search(_NUM + r"\s*(days?|weeks?|months?)[’']?\s*(?:written\s+|prior\s+|advance\s+)?(?:notice)?", text, re.I)
    if not m:
        return None
    n, unit = _to_number(m.group(1)), m.group(2).lower()
    return n * (7 if unit.startswith("week") else 30 if unit.startswith("month") else 1)


def notice_hours(text: str) -> float | None:
    """Notice length in hours, from '24 hours' or 'two days' written notice."""
    m = re.search(_NUM + r"\s*(hours?|days?)[’']?\s*(?:written\s+|prior\s+|advance\s+)?notice", text, re.I)
    if not m:
        return None
    n, unit = _to_number(m.group(1)), m.group(2).lower()
    return n * (24 if unit.startswith("day") else 1)


NO_NOTICE = [
    r"without\s+(?:any\s+|prior\s+|advance\s+|giving\s+)*(?:notice|warning|consent|permission)",
    r"at\s+any\s+time",
    r"whenever\s+(?:he|she|they|the\s+landlord)\s+(?:wish|choose|want)",
]
ENTRY_WORDS = r"\b(?:enter|entry|inspect|inspection|access)\b"



NOT_ACCESS = r"(?:arrears|forfeit|re-?enter|re-?entry|liquidation|bankrupt|insolven)"

def entry_without_notice(text: str) -> bool:
    # Entry in an emergency without notice is normal and allowed, so do not flag it.
    if re.search(r"emergenc", text, re.I):
        return False
    # Forfeiture or re-entry on default is about ending the tenancy, so do not flag it as access.
    if re.search(NOT_ACCESS, text, re.I):
        return False
    return bool(re.search(ENTRY_WORDS, text, re.I)) and any(re.search(p, text, re.I) for p in NO_NOTICE)




def rent_review_months(text: str) -> float | None:
    """How often the clause lets the rent be reviewed, in months. None when not sure."""
    if not (re.search(r"\brent\b", text, re.I)
            and re.search(r"\b(?:review|reviewed|revised|revision|increase|increased)\b", text, re.I)):
        return None
    m = re.search(r"(?:every|each|once\s+(?:every|in\s+every|in\s+any))\s+(?:period\s+of\s+)?"
                  + _NUM + r"[\s-]*(months?|years?)", text, re.I)
    if m:
        n, unit = _to_number(m.group(1)), m.group(2).lower()
        return n * 12 if unit.startswith("year") else n
    m = re.search(_NUM + r"[\s-]?monthly", text, re.I)
    if m:
        return _to_number(m.group(1))
    if re.search(r"\b(?:half[\s-]?yearly|bi-?annual(?:ly)?|twice\s+(?:a|per)\s+year)\b", text, re.I):
        return 6.0
    if re.search(r"\b(?:annual(?:ly)?|yearly|every\s+year|once\s+a\s+year)\b", text, re.I):
        return 12.0
    return None