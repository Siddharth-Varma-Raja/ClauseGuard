"""The dev token helpers hand out login tokens without auth: off unless ENABLE_DEV_TOKEN=true."""
import importlib

from fastapi.testclient import TestClient


def _client(monkeypatch, value):
    if value is None:
        monkeypatch.delenv("ENABLE_DEV_TOKEN", raising=False)
    else:
        monkeypatch.setenv("ENABLE_DEV_TOKEN", value)
    import app.config, app.main
    importlib.reload(app.config)
    importlib.reload(app.main)
    return TestClient(app.main.app)


def _paths(client):
    return {r.path for r in client.app.routes}


def test_dev_token_routes_are_off_by_default(monkeypatch):
    c = _client(monkeypatch, None)
    assert not any(p.startswith("/api/dev") for p in _paths(c))
    assert c.post("/api/dev/token-by-uid", json={"firebase_uid": "x"}).status_code in (404, 405)


def test_dev_token_routes_only_when_enabled(monkeypatch):
    assert "/api/dev/token-by-uid" in _paths(_client(monkeypatch, "true"))
    _client(monkeypatch, None)  # leave the module as production would load it
