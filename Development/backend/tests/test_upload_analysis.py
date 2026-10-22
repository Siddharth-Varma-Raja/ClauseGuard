"""POST /analyses -> real analysis stored -> GET /analyses/{id} returns it (no S3, no MySQL, no Firebase)."""
import sys
import types

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.api import translation_router as tr
from app.api.deps import get_current_user
from app.database import Base, get_db

LEASE = """1. The monthly rent is €1,800 per month.

2. The Tenant shall pay a deposit of €3,600 on signing.

3. The Landlord may enter the property at any time without prior notice.
"""


@pytest.fixture
def client(monkeypatch):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    async def make_tables():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    import asyncio
    asyncio.run(make_tables())

    async def db_override():
        async with AsyncSession(engine, expire_on_commit=False) as s:
            yield s

    app = FastAPI()
    app.include_router(tr.router, prefix="/api")
    app.dependency_overrides[get_db] = db_override
    app.dependency_overrides[get_current_user] = lambda: types.SimpleNamespace(id="user-1")
    monkeypatch.setattr(tr.magic, "from_buffer", lambda b, mime=True: "application/pdf")
    monkeypatch.setattr(
        tr,
        "run_upload_pipeline",
        lambda **kw: {"s3_uri": "s3://x/y", "s3_key": "y", "char_count": len(LEASE), "redacted_text": LEASE},
    )
    return TestClient(app)


def test_upload_returns_real_analysis(client):
    r = client.post("/api/analyses", files={"file": ("Sample-Lease.pdf", b"%PDF-1.4 x", "application/pdf")})
    assert r.status_code == 201, r.text
    aid = r.json()["id"]
    assert r.json()["counts"]["amber"] == 2

    full = client.get(f"/api/analyses/{aid}").json()
    titles = {c["title"]: c["status"] for c in full["clauses"]}
    assert titles["Deposit"] == "amber" and titles["Landlord access"] == "amber"
    assert full["monthlyRentCents"] == 180000
    assert "Sample Property" not in str(full)       # the old placeholder data is gone
