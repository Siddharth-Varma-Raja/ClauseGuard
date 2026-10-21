# ClauseGuard — Identity, Legal Analysis & Backend API

FastAPI · Firebase Authentication · MySQL (SQLAlchemy + Alembic) · AWS S3 · Google Gemini AI · Irish RTB Rules Engine

---

## 🚀 How to Run the Backend

### Prerequisites
* **Python 3.11+** (or Python 3.12 / 3.13)
* **MySQL 8.0+** running locally (or cloud MySQL like Aiven / RDS)
* **libmagic** system library (required for MIME detection):
  ```bash
  # macOS (Homebrew)
  brew install libmagic

  # Ubuntu / Debian
  sudo apt-get install -y libmagic1
  ```

---

### Step-by-Step Setup

```bash
# 1. Navigate to the backend directory
cd Development/backend

# 2. Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 3. Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 4. Configure Environment (.env)
# Ensure .env contains your database connection, Firebase, S3, and Gemini keys:
DATABASE_URL="mysql+aiomysql://root:root@localhost:3306/clauseguard"
DATABASE_URL_SYNC="mysql+pymysql://root:root@localhost:3306/clauseguard"
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173"
FIREBASE_CREDENTIALS_JSON="./firebase-service-account.json"
GEMINI_API_KEY="your-gemini-api-key"
S3_BUCKET_NAME="your-s3-bucket"

# 5. Run Database Migrations (Sync MySQL schema to latest head)
alembic upgrade head

# 6. Start the Development Server
uvicorn app.main:app --reload --port 8000
```

Once running:
* **Liveness Probe**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) $\rightarrow$ `{"status":"ok"}`
* **Interactive Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **ReDoc Documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🔌 API Architecture & Endpoints

All endpoints are hosted cleanly under the unified **`/api`** base path (matching frontend `NEXT_PUBLIC_API_URL`):

### 1. Authentication (`/api/auth`)
* `POST /api/auth/register` — Create MySQL user profile linked to Firebase UID
* `POST /api/auth/logout` — Revoke Firebase tokens and record audit event
* `POST /api/auth/forgot-password` — Send Firebase password reset email

### 2. Lease Documents & Clause Analysis (`/api/analyses`)
* `GET /api/analyses` — List all user's analyses with risk counts (`red`, `amber`, `green`, `grey`)
* `GET /api/analyses/{id}` — Retrieve full clause-by-clause legal review (camelCase)
* `POST /api/analyses` — Upload lease document (PDF/Image $\le$ 25 MB), run OCR, PII redaction, S3 upload, and analysis
* `PATCH /api/analyses/{id}/clauses/{clause_id}` — Mark a specific clause as reviewed (`{ reviewed: true }`)
* `POST /api/analyses/{id}/clauses/{clause_id}/questions` — Ask AI legal questions about a specific clause
* `DELETE /api/analyses` — Delete all analyses and purge files from S3

### 3. Landlord Notice Checker (`/api/notices`)
* `GET /api/notices` — List all notice evaluation summaries
* `GET /api/notices/{id}` — Get detailed notice verdict, checks, statutory citations, and next steps
* `POST /api/notices` — Verify notice compliance against Irish RTB legislation:
  * **Termination Notices**: Checks statutory notice periods (28–224 days), mandatory statutory declarations for Part 4 terminations (sale/own use), and RTB copy rules.
  * **Rent Review Notices**: Evaluates 90-day advance notice rule, 12-month review interval, 3 local market comparables, and **March 2026 Rent Pressure Zone (RPZ) caps (2% / HICP)**.
  * **Landlord Entry Notices**: Verifies the mandatory 24-hour written advance notice rule under Section 12 for peaceful occupation.

### 4. Tenancy Timeline (`/api/events`)
* `GET /api/events` — Retrieve tenancy milestones, lease deadlines, and rent reminders
* `POST /api/events` — Add a new timeline event
* `PATCH /api/events/{id}` — Toggle event completion status (`{ done: true }`)
* `DELETE /api/events/{id}` — Remove a timeline event

### 5. User Preferences & GDPR (`/api/me`)
* `GET /api/me/preferences` — Get explanation detail mode (`simple` / `detailed`) and reminder settings
* `PATCH /api/me/preferences` — Update preferences
* `GET /api/me` — Get current user profile
* `DELETE /api/me` — Cascading account wipe (S3 files, analyses, notices, events, preferences)
* `GET /api/me/gdpr-export` — Export all stored account data under GDPR Article 15

---

## 🛠️ Postman & Tooling Utilities

### 1. Generating Postman Specification (`openapi.yaml`)
Whenever routes or models are modified, run:
```bash
python generate_openapi.py
```
This fetches the live OpenAPI schema from the running FastAPI server and writes `openapi.yaml`. In Postman:
1. Click **Import** (top left).
2. Select `Development/backend/openapi.yaml`.
3. Postman will automatically create all requests with proper headers and sample bodies.

### 2. Generating Firebase Test Token
To test protected endpoints in Postman without logging in via the frontend web browser:
```bash
python generate_token.py
```
Copy the generated JWT token and set the Postman header:
```text
Authorization: Bearer <TOKEN>
```

---

## 🧪 Running Tests

```bash
pytest
```
