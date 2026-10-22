"""Store an analysis in the database as DocumentReview / ClauseReview / ClauseSource rows.

`analyse_text()` (demo.py) does the work: split clauses -> topic -> rules engine.
This module only converts its result into the rows the rest of the app already reads
(GET /analyses/{id} in translation_router.py).
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.review import (
    ClauseReview,
    ClauseSource,
    DocumentReview,
    ReviewStatus,
    RiskLevel,
    SourceType,
)
from app.services.analysis.demo import analyse_text

_RISK = {
    "red": RiskLevel.LIKELY_UNENFORCEABLE,
    "amber": RiskLevel.NEEDS_REVIEW,
    "green": RiskLevel.COMPLIANT,
    "grey": RiskLevel.INFORMATIONAL,
}


def _source_type(kind: str) -> SourceType:
    return SourceType.RTB_GUIDANCE if "guidance" in kind.lower() else SourceType.LEGISLATION


async def save_analysis(db: AsyncSession, document_id: str, redacted_text: str) -> DocumentReview:
    """Analyse `redacted_text` and add the rows to `db`. The caller commits."""
    a = analyse_text(redacted_text)
    c = a["counts"]

    review = DocumentReview(
        document_id=document_id,
        total_clauses=len(a["clauses"]),
        likely_unenforceable_count=c["red"],
        needs_review_count=c["amber"],
        compliant_count=c["green"],
        informational_count=c["grey"],
        property_address=a["propertyAddress"],
        monthly_rent_cents=a["monthlyRentCents"],
        deposit_cents=a["depositCents"],
        tenancy_start=a["tenancyStart"],
        term_months=a["termMonths"],
        page_count=a["pageCount"],
        review_status=ReviewStatus.COMPLETED,
        reviewed_at=datetime.now(timezone.utc),
    )
    db.add(review)
    await db.flush()

    for i, cl in enumerate(a["clauses"], start=1):
        row = ClauseReview(
            review_id=review.id,
            clause_number=i,
            clause_title=cl["title"][:500],
            clause_text=cl["text"],
            page=cl["page"],
            confidence=cl["confidence"],
            risk_level=_RISK[cl["status"]],
            color_code=cl["status"],
            plain_english=cl["explanation"],
            flagging_reason=cl["reason"],
            suggested_steps=json.dumps(cl["nextSteps"]),
        )
        db.add(row)
        await db.flush()
        for s in cl["sources"]:
            db.add(
                ClauseSource(
                    clause_review_id=row.id,
                    source_type=_source_type(s["kind"]),
                    source_name=(s["title"] or "Source")[:500],
                    description=s.get("note"),
                    link=s.get("url"),
                )
            )
    return review
