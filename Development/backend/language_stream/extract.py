import re

MONEY = re.compile(r"€\s?(\d[\d,]*(?:\.\d+)?)")
PERIOD = re.compile(r"\b(\d+|one|two|three|four|five|six)\s+(day|week|month|hour)s?\b", re.I)
WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6}


def extract_values(text):
    amounts = [float(m.replace(",", "")) for m in MONEY.findall(text)]
    periods = [(int(n) if n.isdigit() else WORDS[n.lower()], u.lower())
               for n, u in PERIOD.findall(text)]
    return {"amounts_eur": amounts, "periods": periods}