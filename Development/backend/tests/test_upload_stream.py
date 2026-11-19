"""POST /analyses?stream=true -> NDJSON progress events, each sent once its step has finished."""
import asyncio
import json
import types

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.api import translation_router as tr
from app.api.deps import get_current_user
from app.database import Base, get_db
from app.services.document.pipeline import PipelineError

LEASE = """1. The monthly rent is €1,800 per month.

2. The Tenant shall pay a deposit of €3,600 on signing.

3. The Landlord may enter the property at any time without prior notice.
"""

PIPELINE_STEPS = ["extract", "lease_check", "redact", "store"]


@pytest.fixture
def ctx(monkeypatch):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    async def make_tables():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(make_tables())

    def session():
        return AsyncSession(engine, expire_on_commit=False)

    async def db_override():
        async with session() as s:
            yield s

    app = FastAPI()
    app.include_router(tr.router, prefix="/api")
    app.dependency_overrides[get_db] = db_override
    app.dependency_overrides[get_current_user] = lambda: types.SimpleNamespace(id="user-1")
    monkeypatch.setattr(tr, "_session_factory", session)
    monkeypatch.setattr(tr.magic, "from_buffer", lambda b, mime=True: "application/pdf")

    def fake_pipeline(on_step=None, on_estimate=None, **kw):
        if on_estimate:
            on_estimate(2.5)
        for i, step in enumerate(PIPELINE_STEPS):
            if on_step:
                on_step(step, 0.1 * (i + 1))
        return {"gcs_uri": "gs://x/y", "gcs_key": "y", "char_count": len(LEASE), "redacted_text": LEASE}

    monkeypatch.setattr(tr, "run_upload_pipeline", fake_pipeline)
    return types.SimpleNamespace(client=TestClient(app), monkeypatch=monkeypatch)


def _events(response):
    return [json.loads(line) for line in response.text.splitlines() if line.strip()]


def _upload(client, content=b"%PDF-1.4 x"):
    return client.post("/api/analyses?stream=true", files={"file": ("lease.pdf", content, "application/pdf")})


def test_stream_reports_each_step_in_order_then_result(ctx):
    r = _upload(ctx.client)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"].startswith("application/x-ndjson")

    events = _events(r)
    steps = [e["step"] for e in events if e["type"] == "step"]
    assert steps == ["received", *PIPELINE_STEPS, "analyse"]
    step_events = [e for e in events if e["type"] == "step"]
    assert [e["seconds"] for e in step_events[1:5]] == [0.1, 0.2, 0.3, 0.4]

    # The remaining-time estimate arrives before the steps it covers.
    assert events[1] == {"type": "estimate", "remainingSeconds": 2.5}

    result = events[-1]
    assert result["type"] == "result" and result["status"] == 201
    assert result["data"]["counts"]["amber"] == 2
    assert result["totalSeconds"] >= 0

    # The streamed analysis is saved like a normal upload.
    full = ctx.client.get(f"/api/analyses/{result['data']['id']}")
    assert full.status_code == 200
    assert full.json()["monthlyRentCents"] == 180000


def test_stream_reports_not_a_lease_as_error_event(ctx):
    def rejecting_pipeline(on_step=None, **kw):
        on_step("extract", 0.1)
        raise PipelineError("Uploaded file does not appear to be a residential lease agreement.", step="lease_validation")

    ctx.monkeypatch.setattr(tr, "run_upload_pipeline", rejecting_pipeline)
    events = _events(_upload(ctx.client))

    assert [e.get("step") for e in events[:-1]] == ["received", "extract"]
    assert events[-1]["type"] == "error"
    assert events[-1]["status"] == 422
    assert "residential lease" in events[-1]["detail"]


def test_stream_still_rejects_bad_files_with_plain_http_errors(ctx):
    r = _upload(ctx.client, content=b"")
    assert r.status_code == 422
    assert "empty" in r.json()["detail"].lower()


def test_without_stream_flag_response_is_unchanged(ctx):
    r = ctx.client.post("/api/analyses", files={"file": ("lease.pdf", b"%PDF-1.4 x", "application/pdf")})
    assert r.status_code == 201
    assert r.json()["counts"]["amber"] == 2
