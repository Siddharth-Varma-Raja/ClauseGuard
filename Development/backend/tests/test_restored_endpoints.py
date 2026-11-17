"""
Endpoints the frontend calls that were deleted in commit a646141 and restored,
plus the upload saving its storage location. SQLite in memory; GCS, Firebase
and Gemini are stubbed, so nothing leaves the machine.
"""
import asyncio
import itertools
import re
import types

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import noload

from app.api import translation_router as tr
from app.api.deps import get_current_user
from app.core.rate_limit import limiter
from app.database import Base, get_db
from app.models.document import Document
from app.models.user import User

LEASE = """1. The monthly rent is €1,800 per month.

2. The Tenant shall pay a deposit of €3,600 on signing.

3. The Landlord may enter the property at any time without prior notice.
"""


@pytest.fixture
def ctx(monkeypatch):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    async def setup():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with AsyncSession(engine) as s:
            s.add(User(id="user-1", firebase_uid="fb-1", email="tenant@example.com", display_name="Test Tenant"))
            await s.commit()

    asyncio.run(setup())

    async def db_override():
        async with AsyncSession(engine, expire_on_commit=False) as s:
            yield s

    async def user_override(db: AsyncSession = Depends(get_db)):
        # Same query as app.api.deps.get_current_user.
        stmt = select(User).options(noload(User.documents)).where(User.id == "user-1")
        return (await db.execute(stmt)).scalar_one()

    app = FastAPI()
    app.state.limiter = limiter
    app.include_router(tr.router, prefix="/api")
    app.dependency_overrides[get_db] = db_override
    app.dependency_overrides[get_current_user] = user_override
    app.dependency_overrides[tr.get_genai_client] = lambda: object()

    deleted, revoked, n = [], [], itertools.count(1)
    monkeypatch.setattr(tr, "delete_from_gcs", deleted.append)
    monkeypatch.setattr(tr, "revoke_refresh_tokens", revoked.append)
    monkeypatch.setattr(tr.magic, "from_buffer", lambda b, mime=True: "application/pdf")

    def fake_pipeline(**kw):
        key = f"documents/user-1/{next(n)}.txt"
        return {"gcs_uri": f"gs://clauseguard-leases-prod/{key}", "gcs_key": key,
                "char_count": len(LEASE), "redacted_text": LEASE}

    monkeypatch.setattr(tr, "run_upload_pipeline", fake_pipeline)

    async def query(stmt):
        async with AsyncSession(engine) as s:
            return (await s.execute(stmt)).scalars().all()

    ns = types.SimpleNamespace(
        client=TestClient(app), deleted=deleted, revoked=revoked, engine=engine,
        query=lambda stmt: asyncio.run(query(stmt)),
    )
    yield ns
    asyncio.run(engine.dispose())


def upload(c) -> dict:
    r = c.client.post("/api/analyses", files={"file": ("lease.pdf", b"%PDF-1.4 x", "application/pdf")})
    assert r.status_code == 201, r.text
    return r.json()


# ── Fix 2: storage location is saved ──────────────────────────────────────────

def test_upload_saves_storage_location(ctx):
    body = upload(ctx)
    assert body["gcsKey"] == "documents/user-1/1.txt"
    doc = ctx.query(select(Document).where(Document.id == body["id"]))[0]
    assert doc.s3_key == "documents/user-1/1.txt"
    assert doc.s3_uri == "gs://clauseguard-leases-prod/documents/user-1/1.txt"


# ── Analyses ──────────────────────────────────────────────────────────────────

def test_clause_reviewed_is_saved(ctx):
    aid = upload(ctx)["id"]
    clause = ctx.client.get(f"/api/analyses/{aid}").json()["clauses"][0]
    assert clause["reviewed"] is False
    r = ctx.client.patch(f"/api/analyses/{aid}/clauses/{clause['id']}", json={"reviewed": True})
    assert r.status_code == 204
    after = ctx.client.get(f"/api/analyses/{aid}").json()["clauses"][0]
    assert after["reviewed"] is True


def test_delete_all_analyses_wipes_stored_files(ctx):
    upload(ctx)
    upload(ctx)
    assert ctx.client.delete("/api/analyses").status_code == 204
    assert sorted(ctx.deleted) == ["documents/user-1/1.txt", "documents/user-1/2.txt"]
    assert ctx.client.get("/api/analyses").json() == []


def test_clause_question(ctx, monkeypatch):
    class FakeModels:
        def generate_content(self, **kw):
            return types.SimpleNamespace(text="A landlord must give 24 hours notice.")

    monkeypatch.setattr(tr, "get_genai_client", lambda: types.SimpleNamespace(models=FakeModels()))
    aid = upload(ctx)["id"]
    cid = ctx.client.get(f"/api/analyses/{aid}").json()["clauses"][0]["id"]
    r = ctx.client.post(f"/api/analyses/{aid}/clauses/{cid}/questions",
                        json={"question": "Is this fair?", "history": [{"role": "user", "text": "hi"}]})
    assert r.status_code == 200
    assert r.json() == {"answer": "A landlord must give 24 hours notice."}


# ── Account ───────────────────────────────────────────────────────────────────

def test_profile(ctx):
    r = ctx.client.get("/api/me")
    assert r.status_code == 200
    assert r.json()["email"] == "tenant@example.com"
    assert r.json()["firebaseUid"] == "fb-1"


def test_gdpr_export(ctx):
    upload(ctx)
    r = ctx.client.get("/api/me/gdpr-export")
    assert r.status_code == 200
    assert "user" in r.json() and "exportedAt" in r.json()


def test_delete_account_wipes_files_and_revokes_tokens(ctx):
    upload(ctx)
    assert ctx.client.delete("/api/me").status_code == 204
    assert ctx.deleted == ["documents/user-1/1.txt"]
    assert ctx.revoked == ["fb-1"]
    assert ctx.query(select(User).where(User.id == "user-1"))[0].is_active is False


# ── Preferences ───────────────────────────────────────────────────────────────

def test_preferences_round_trip(ctx):
    assert ctx.client.get("/api/me/preferences").json() == {"explanationDetail": "simple", "remindersEnabled": True}
    r = ctx.client.patch("/api/me/preferences", json={"explanationDetail": "detailed"})
    assert r.status_code == 200
    assert ctx.client.get("/api/me/preferences").json()["explanationDetail"] == "detailed"


# ── Timeline ──────────────────────────────────────────────────────────────────

def test_timeline_events_crud(ctx):
    r = ctx.client.post("/api/events", json={"title": "Rent due", "date": "2026-12-01", "kind": "rent", "note": ""})
    assert r.status_code == 201, r.text
    eid = r.json()["id"]
    assert [e["title"] for e in ctx.client.get("/api/events").json()] == ["Rent due"]
    assert ctx.client.patch(f"/api/events/{eid}", json={"done": True}).status_code == 204
    assert ctx.client.get("/api/events").json()[0]["done"] is True
    assert ctx.client.delete(f"/api/events/{eid}").status_code == 204
    assert ctx.client.get("/api/events").json() == []


# ── Notices ───────────────────────────────────────────────────────────────────

def test_notices_create_list_get(ctx):
    r = ctx.client.post("/api/notices", json={"type": "rent", "answers": {}})
    assert r.status_code == 201, r.text
    nid = r.json()["id"]
    assert [n["id"] for n in ctx.client.get("/api/notices").json()] == [nid]
    assert ctx.client.get(f"/api/notices/{nid}").status_code == 200
    assert ctx.client.get("/api/notices/does-not-exist").status_code == 404


def test_landlord_email_accepts_frontend_payload(ctx, monkeypatch):
    monkeypatch.setattr(tr, "generate_landlord_email",
                        lambda **kw: {"email_subject": "About my lease", "email_body": "Dear landlord"})
    # The frontend sends snake_case "detected_deviations".
    r = ctx.client.post("/api/notices/generate-landlord-email",
                        json={"detected_deviations": ["Clause 3 (Landlord access): no notice"]})
    assert r.status_code == 200, r.text
    assert r.json() == {"emailSubject": "About my lease", "emailBody": "Dear landlord"}


# ── Performance: the analyses list must not load every clause ─────────────────

def test_analyses_list_uses_one_query_whatever_the_lease_count(ctx):
    from sqlalchemy import event
    for _ in range(5):
        upload(ctx)
    statements = []
    listener = lambda conn, cur, stmt, params, context, many: statements.append(stmt)
    event.listen(ctx.engine.sync_engine, "before_cursor_execute", listener)
    try:
        r = ctx.client.get("/api/analyses")
    finally:
        event.remove(ctx.engine.sync_engine, "before_cursor_execute", listener)
    assert r.status_code == 200 and len(r.json()) == 5
    assert all(item["counts"]["amber"] == 2 for item in r.json())
    selects = [s for s in statements if s.lstrip().upper().startswith("SELECT")]
    print(f"\nGET /analyses with 5 leases ran {len(selects)} SELECTs:", [re.sub(r"\s+", " ", s)[:70] for s in selects])
    # 1 = the user lookup, 1 = the list itself.
    assert len(selects) == 2, f"{len(selects)} queries: {selects}"
