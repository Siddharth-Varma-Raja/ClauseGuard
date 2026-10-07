# ClauseGuard — Identity & Auth Backend

Python 3.12 · FastAPI · Firebase Admin SDK · PostgreSQL · Alembic

---

## Quick start

```bash
cd backend

# 1. Create and activate a virtual environment
python3 -m venv .venv && source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env: set FIREBASE_CREDENTIALS_JSON and DATABASE_URL

# 4. Run database migrations
alembic upgrade head

# 5. Start the development server
uvicorn app.main:app --reload --port 8081
```

Interactive docs: http://localhost:8081/docs

---

## Auth flow (diagram)

```
Frontend (React)
  │
  │  1. Sign in / sign up via Firebase SDK (email+password or Google)
  │  2. Firebase returns an ID token (JWT, short-lived ~1 h)
  │
  └─► POST /api/v1/auth/register   ← first login only; writes profile to PostgreSQL
      GET  /api/v1/account/me      ← every subsequent request; Bearer <id_token>
      PATCH /api/v1/account/me     ← profile update
      POST /api/v1/auth/logout     ← revokes ALL Firebase refresh tokens server-side
      POST /api/v1/auth/forgot-password ← triggers Firebase reset email
```

---

## Session handling

- **No server-side sessions.** Sessions are stateless: each request must carry a Firebase ID token in the `Authorization: Bearer <token>` header.
- The `get_current_user` dependency calls `firebase_admin.auth.verify_id_token(token, check_revoked=True)` on every request.
- `check_revoked=True` means that calling `/auth/logout` (which calls `revoke_refresh_tokens`) immediately invalidates all sessions across all devices.
- The front end must refresh the ID token every ~55 minutes using `user.getIdToken(true)`.

---

## API Security checklist

| Control | Implementation |
|---|---|
| Token verification | Firebase Admin SDK verifies RS256 signature + expiry + revocation |
| Rate limiting | SlowAPI — 10/min on auth endpoints, 60/min on API endpoints |
| CORS | Explicit allowlist via `ALLOWED_ORIGINS` in `.env` |
| HTTPS | Caddy in production (automatic TLS); set `ALLOWED_ORIGINS` to HTTPS URLs |
| Audit log | Every auth action written to `audit_logs` table (actor, action, IP, timestamp) |
| Account deactivation | Soft-delete + Firebase token revocation |
| GDPR export | `GET /api/v1/account/me/gdpr-export` |
| IP extraction | Reads `X-Forwarded-For` (Caddy sets this) |

---

## Environment variables

| Variable | Description |
|---|---|
| `FIREBASE_CREDENTIALS_JSON` | Path to Firebase service account JSON |
| `DATABASE_URL` | Async PostgreSQL URL (`postgresql+asyncpg://…`) |
| `DATABASE_URL_SYNC` | Sync URL for Alembic (`postgresql+psycopg2://…`) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `RATE_LIMIT_AUTH` | SlowAPI limit string for auth routes (default `10/minute`) |
| `RATE_LIMIT_API` | SlowAPI limit string for all other routes (default `60/minute`) |

---

## Running tests

```bash
pip install pytest pytest-anyio anyio httpx
pytest
```
