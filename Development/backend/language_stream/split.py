import re

from .schema import Clause

START = re.compile(
    r"^\s*(?:clause\s+)?(?:\d+(?:\.\d+)+\.?|\d+[.)]|\([a-z0-9]{1,3}\))\s+\S",
    re.I,
)


def split_clauses(pages, lease_id):
    clauses, buf, page_of = [], [], 1

    def flush():
        text = " ".join(" ".join(buf).split())
        if len(text) > 20:
            clauses.append(Clause(lease_id=lease_id, idx=len(clauses),
                                  text=text, page=page_of))

    for pno, page in enumerate(pages, 1):
        for line in page.splitlines():
            if START.match(line) and buf:
                flush()
                buf = []
            if not buf:
                page_of = pno
            if line.strip():
                buf.append(line.strip())
    flush()
    return clauses