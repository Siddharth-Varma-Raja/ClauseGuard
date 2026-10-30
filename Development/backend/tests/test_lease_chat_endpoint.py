"""POST /analyses/{id}/questions: answers from the saved results (fake database, fake model, no Firebase)."""
import asyncio
import types

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.api import lease_chat_router as lc
from app.api import translation_router as tr
from app.api.deps import get_current_user
from app.database import Base, get_db

LEASE = """1. The monthly rent is €1,800 per month.

2. The Tenant shall pay a deposit of €3,600 on signing.

3. The Landlord may enter the property at any time without prior notice.

4. The Tenant shall keep the property clean.
"""


@pytest.fixture
def client(monkeypatch):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    async def make_tables():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(make_tables())

    async def db_override():
        async with AsyncSession(engine, expire_on_commit=False) as s:
            yield s

    app = FastAPI()
    app.include_router(tr.router, prefix="/api")
    app.include_router(lc.router, prefix="/api")
    app.dependency_overrides[get_db] = db_override
    app.dependency_overrides[get_current_user] = lambda: types.SimpleNamespace(id="user-1")
    monkeypatch.setattr(tr.magic, "from_buffer", lambda b, mime=True: "application/pdf")
    monkeypatch.setattr(
        tr,
        "run_upload_pipeline",
        lambda **kw: {"s3_uri": "s3://x/y", "s3_key": "y", "char_count": len(LEASE), "redacted_text": LEASE},
    )
    return TestClient(app)


def _upload(client) -> str:
    r = client.post("/api/analyses", files={"file": ("Sample-Lease.pdf", b"%PDF-1.4 x", "application/pdf")})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_question_is_answered_from_saved_results(client, monkeypatch):
    seen = {}

    async def fake_gemini(system, turns):
        seen["turns"] = turns
        return "Two clauses need attention: the deposit and landlord access."

    monkeypatch.setattr(lc, "_ask_gemini", fake_gemini)
    aid = _upload(client)
    r = client.post(
        f"/api/analyses/{aid}/questions",
        json={"question": "What is wrong in this lease?",
              "history": [{"role": "user", "text": "hi"}, {"role": "assistant", "text": "hello"}]},
    )
    assert r.status_code == 200, r.text
    assert r.json() == {"answer": "Two clauses need attention: the deposit and landlord access."}
    prompt = seen["turns"][-1][1]
    assert "Deposit" in prompt and "Landlord access" in prompt
    assert "TENANT QUESTION: What is wrong in this lease?" in prompt
    assert "Sample-Lease" not in prompt                  # no file name
    assert "The Landlord may enter the property" not in prompt   # whole clauses are not sent, only short evidence quotes


def test_model_failure_gives_summary_from_saved_results(client, monkeypatch):
    async def broken(system, turns):
        raise RuntimeError("model down")

    monkeypatch.setattr(lc, "_ask_gemini", broken)
    aid = _upload(client)
    r = client.post(f"/api/analyses/{aid}/questions", json={"question": "What is wrong?"})
    assert r.status_code == 200
    assert "flagged 2 clauses worth checking" in r.json()["answer"]


def test_empty_question_is_400_and_missing_is_422(client):
    aid = _upload(client)
    assert client.post(f"/api/analyses/{aid}/questions", json={"question": "  "}).status_code == 400
    assert client.post(f"/api/analyses/{aid}/questions", json={}).status_code == 422


def test_unknown_analysis_is_404(client):
    r = client.post("/api/analyses/does-not-exist/questions", json={"question": "What is wrong?"})
    assert r.status_code == 404
