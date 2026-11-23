"""First version of the lease action list.

Reads clauses and sorts each one by WHO has the duty and WHAT kind it is:
  landlord_must, landlord_may, tenant_must, not_allowed,
  plus two extra lists: ending_lease and unpaid_rent.

Rule based on purpose: every item keeps the original clause number and a short quote,
so the tenant can see exactly where it came from. No lease text leaves the computer.

Run:  python action_list.py lease.txt
      python action_list.py labelled_clauses_v5.jsonl L4   (one lease from a clauses file)
"""
import re, sys, json

CLAUSE_START = re.compile(r"^\s*(\d{1,2})[.)]\s+(.*)")

def split_clauses(text):
    """Split on numbered lines ('1. ...'). Continuation lines are joined."""
    clauses, cur = [], None
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        m = CLAUSE_START.match(line)
        if m:
            if cur:
                clauses.append(cur)
            cur = {"number": int(m.group(1)), "text": m.group(2)}
        elif cur:
            if line.isupper() and len(line) < 60:   # section heading, not part of the clause
                continue
            cur["text"] += " " + line
    if cur:
        clauses.append(cur)
    return clauses

PARTY = re.compile(r"\b(landlord|lessor|owner|managing agent|tenants?|lessee|licensee|occupier|resident)\b")
LANDLORD_WORDS = {"landlord", "lessor", "owner", "managing agent"}
NEG = r"(?:shall|must|will|may|can)\s+not|is not (?:allowed|permitted) to|cannot|shall\s+never"
MUST = r"(?:shall|must|will|agrees to|is required to|is responsible for|understands and agrees)"
MAY = r"(?:may|is entitled to|has the right to|reserves the right to)(?!\s+(?:be|result|have been|not)\b)"
MODAL = re.compile(rf"\b(?P<neg>{NEG})\b|\b(?P<must>{MUST})\b|\b(?P<may>{MAY})")

def sentences(text):
    return [s.strip() for s in re.split(r"(?<=[.;])\s+", text) if s.strip()]

SKIP_SUBJECT = re.compile(r"\b(tenancy|agreement|lease|notice|there|charge|fee|viewings?|regulation)\b")
RESPONSIBLE = re.compile(r"(?:responsibility of|duty of|obligation of)\s+(?:the\s+)?(landlord|tenants?)\s+to\b")
LIABLE = re.compile(r"\b(landlord|tenants?)\s+(?:will|shall)\s+be\s+liable\b")
PAYS = re.compile(r"\b(landlord|tenants?)\s+(?:hereby\s+)?pays\b")

def classify_sentence(s):
    """Return a list with one bucket for the first duty or right in the sentence.
    The party is the NEAREST party word before the modal verb ("the Tenant shall ...")."""
    low = re.sub(r"^\s*\d+(?:\.\d+)*[.)]?\s*", "", s.lower())
    if re.match(r"(?:that\s+)?(?:the\s+)?(?:tenant\s+)?not to\b", low):
        return ["not_allowed"]
    if re.match(r"(?:any\s+)?notices?\b", low):          # rules about how notices are served
        return []
    if re.match(r"to\s+[a-z]+", low):                        # "3.4 To pay promptly ..." (tenant covenants)
        return ["tenant_must"]
    m = re.search(r"\b(landlord|tenants?)\b[^.]{0,80}\b(?:is|are)\b[^.]{0,60}\bentitled to\b", low)
    if m:
        return ["landlord_may" if m.group(1) == "landlord" else "tenant_may"]
    m = RESPONSIBLE.search(low) or LIABLE.search(low) or PAYS.search(low)
    if m:
        return ["landlord_must" if m.group(1) == "landlord" else "tenant_must"]
    for m in MODAL.finditer(low):
        prefix = low[max(0, m.start() - 80):m.start()]
        parties = list(PARTY.finditer(prefix))
        if not parties:
            continue
        between = prefix[parties[-1].end():]
        if SKIP_SUBJECT.search(between):                    # subject is not a person ("this tenancy shall ...")
            continue
        who = "landlord" if parties[-1].group(1) in LANDLORD_WORDS else "tenant"
        if m.group("neg"):
            return ["not_allowed"]
        if m.group("must"):
            return [f"{who}_must"]
        if m.group("may"):
            return [f"{who}_may"]
    return []

ENDING = re.compile(r"\bterminat|\bevict|forfeit|end the tenancy|ending the tenancy|\bnotice to quit|re-?enter|(?:recover|regain|take) possession", re.I)
NOT_A_CONDITION = re.compile(r"(?:prior to|upon|after|following|before)\s+(?:the\s+)?terminat|shall not terminate these agreements", re.I)
UNPAID = re.compile(r"late (?:with|in paying)|unpaid|not paid|fails? to pay|arrears|overdue|default", re.I)

def extract(clauses):
    result = {k: [] for k in ["landlord_must", "landlord_may", "tenant_must", "tenant_may", "not_allowed", "charges", "ending_lease", "unpaid_rent"]}
    for c in clauses:
        if c["text"].strip().isupper():                       # a heading, not a clause
            continue
        for s in sentences(c["text"]):
            if s.isupper():                                   # heading stuck to the end of a clause
                continue
            for bucket in classify_sentence(s):
                result[bucket].append({"clause": c["number"], "quote": s[:200]})
            if re.search(r"€\s?\d|\b(?:charge|fee)s?\b", s, re.I):
                result["charges"].append({"clause": c["number"], "quote": s[:200]})
            if ENDING.search(s) and not NOT_A_CONDITION.search(s):
                result["ending_lease"].append({"clause": c["number"], "quote": s[:200]})
            if UNPAID.search(s):
                result["unpaid_rent"].append({"clause": c["number"], "quote": s[:200]})
    return result

TITLES = {"landlord_must": "Landlord must", "landlord_may": "Landlord may (rights)",
          "tenant_must": "Tenant must", "tenant_may": "Tenant may (rights)",
          "not_allowed": "Not allowed", "charges": "Charges and fees", "ending_lease": "Ending the lease",
          "unpaid_rent": "If rent is not paid"}

if __name__ == "__main__":
    path = sys.argv[1]
    if path.endswith(".jsonl"):
        # a labelled-clauses file: one JSON clause per line with a "text" field
        raw = [l.lstrip("\ufeff") for l in open(path, encoding="utf-8")]
        rows = [json.loads(l) for l in raw if l.strip().startswith("{")]
        want = sys.argv[2] if len(sys.argv) > 2 else None   # optional lease_id, e.g. L4
        clauses = [{"number": r.get("idx", i), "text": r["text"]}
                   for i, r in enumerate(rows) if want is None or r.get("lease_id") == want]
    else:
        clauses = split_clauses(open(path, encoding="utf-8").read())
    res = extract(clauses)
    for k, title in TITLES.items():
        print(f"\n== {title} ({len(res[k])})")
        for it in res[k]:
            print(f"  [clause {it['clause']}] {it['quote']}")


# ---- priority: a short list of the items that matter most --------------------------------------
GROUP_BASE = {"not_allowed": 3, "unpaid_rent": 3, "tenant_must": 2, "charges": 2, "ending_lease": 2}
SHOW_ORDER = ["not_allowed", "unpaid_rent", "charges", "tenant_must", "ending_lease"]   # label shown when an item is in several
MONEY = re.compile(r"€\s?\d|\b\d+\s?(?:euro|eur)\b", re.I)
TIME = re.compile(r"\b(?:within|by)\b[^.]{0,30}\b\d+\s+(?:days?|weeks?|months?)|\b\d+\s+(?:days?|weeks?|months?)['’]?\s*(?:written\s+)?notice|\bon the (?:first|1st)\b|\bin advance\b|\bevery\s+(?:\d+\s+)?(?:months?|weeks?)\b", re.I)
CONSEQUENCE = re.compile(r"forfeit|retain|deduct|penalt|surcharge|legal action|terminate|evict|lose|liable|withheld", re.I)
MONEY_TOPIC = re.compile(r"\b(?:deposit|rent|fee|charge)s?\b", re.I)
ROUTINE = re.compile(r"clean|tidy|neighbour|nuisance|noise|keys|light bulb|good order", re.I)
TAGS = {"not_allowed": "Not allowed", "unpaid_rent": "If rent is late", "charges": "Money", "tenant_must": "You must", "ending_lease": "Ending the lease"}


def prioritise(action_list, limit=5):
    """Pick the few items a tenant should read first, from an action list.

    Rule based and explainable: an item scores higher when it has money, a deadline or notice period,
    a consequence (losing the deposit, ending the tenancy), is a "not allowed" rule, or shows up in
    several groups. Routine duties (keep it clean, keys, noise) score lower. Items are returned as
    {"clause", "quote", "group"}, best first; ties keep lease order.
    """
    seen = {}
    for group in GROUP_BASE:
        for it in (action_list or {}).get(group, []):
            key = (str(it["clause"]), it["quote"])
            seen.setdefault(key, {"clause": str(it["clause"]), "quote": it["quote"], "groups": []})["groups"].append(group)

    scored = []
    for item in seen.values():
        q = item["quote"]
        score = max(GROUP_BASE[g] for g in item["groups"])
        score += 2 * bool(MONEY.search(q)) + 2 * bool(TIME.search(q)) + 2 * bool(CONSEQUENCE.search(q))
        score += bool(MONEY_TOPIC.search(q)) + (len(item["groups"]) - 1)
        score -= 2 * bool(ROUTINE.search(q))
        shown = next(g for g in SHOW_ORDER if g in item["groups"])
        order = [int(p) if p.isdigit() else 0 for p in re.findall(r"\d+", item["clause"])[:1]] or [0]
        scored.append((-score, order[0], {"clause": item["clause"], "quote": q, "group": shown}))
    scored.sort(key=lambda t: (t[0], t[1]))
    return [s[2] for s in scored[:limit]]
