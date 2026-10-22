import json

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.database import Base
from app.models.review import ClauseReview, DocumentReview, RiskLevel
from app.services.analysis.persist import save_analysis

LEASE = """1. The monthly rent is €1,800 per month.

2. The Tenant shall pay a deposit of €3,600 on signing.

3. The Landlord may enter the property at any time without prior notice.

4. The Tenant shall keep the property clean.
"""


@pytest.mark.asyncio
async def test_save_analysis_writes_rows():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSession(engine, expire_on_commit=False) as db:
        review = await save_analysis(db, "doc-1", LEASE)
        await db.commit()

        rows = (await db.execute(select(ClauseReview).order_by(ClauseReview.clause_number))).scalars().all()
        assert len(rows) == 4
        assert review.monthly_rent_cents == 180000 and review.deposit_cents == 360000
        assert review.needs_review_count == 2 and review.likely_unenforceable_count == 0
        deposit = next(r for r in rows if r.clause_title == "Deposit")
        assert deposit.risk_level == RiskLevel.NEEDS_REVIEW
        assert json.loads(deposit.suggested_steps)
        assert len(deposit.sources) == 1
        stored = (await db.execute(select(DocumentReview))).scalars().all()
        assert len(stored) == 1
    await engine.dispose()
