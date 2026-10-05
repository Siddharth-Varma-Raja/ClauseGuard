from enum import Enum
from pydantic import BaseModel

CATEGORIES = ["deposit", "notice_period", "rent_review", "termination",
              "repairs", "access", "fees", "waiver", "other"]


class Verdict(str, Enum):
    COMPLIANT = "compliant"
    POSSIBLE_PROBLEM = "possible_problem"
    NON_COMPLIANT = "non_compliant"
    NEEDS_REVIEW = "needs_review"


class Clause(BaseModel):
    lease_id: str
    idx: int
    text: str
    page: int | None = None