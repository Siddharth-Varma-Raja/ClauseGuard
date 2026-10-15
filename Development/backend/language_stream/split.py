import re

from .schema import Clause

START = re.compile(
    r"^\s*(?:clause\s+)?(?:\d+(?:\.\d+)+\.?|\d+[.)]|\((?:[a-z]|[ivxl]{2,6}|\d{1,2})\)|[•*-])\s+\S",
    re.I,
)

HEADING = re.compile(r"^\s*(?:(?:FIRST|SECOND|THIRD) SCHEDULE|SPECIAL CONDITIONS|SIGNED)\b")

FOOTER = re.compile(r"\s*\d+\s*\|\s*P\s?age\b|\s*Page\s*\|\s*\d+\s*of\s*\d+", re.I)

def clean_text(text):
    """Remove page footers like '1 | P age' and tidy the spaces."""
    return " ".join(FOOTER.sub(" ", text).split())

def split_clauses(pages, lease_id):
    clauses, buf, page_of = [], [], 1

    def flush():
        text = " ".join(" ".join(buf).split())
        if len(text) > 20:
            clauses.append(Clause(lease_id=lease_id, idx=len(clauses),
                                  text=text, page=page_of))

    for pno, page in enumerate(pages, 1):
        for line in page.splitlines():
            if (START.match(line) or HEADING.match(line)) and buf:
                flush()
                buf = []
            if not buf:
                page_of = pno
            if line.strip():
                buf.append(line.strip())
    flush()
    return clauses

SIGNATURE = re.compile(r"\b(signed by|signature|in witness whereof|witness)\b", re.I)


def is_junk(text):
    t = text.strip()
    if len(t) < 40:                       # a heading or a fragment
        return True
    if t.isupper() and len(t) < 100:      # an all-caps heading such as "DEPOSIT"
        return True
    if len(t) < 300 and SIGNATURE.search(t):   # a signature or witness block
        return True
    return False

def split_clean(pages, lease_id):
    """Split into clauses, then strip page footers and drop junk clauses."""
    out = []
    for c in split_clauses(pages, lease_id):
        text = clean_text(c.text)
        if not is_junk(text):
            out.append(c.model_copy(update={"text": text}))
    return out