# ClauseGuard — Deployment Guide

This guide covers **production deployment** for the ClauseGuard platform:
**FastAPI Backend** (Render / Docker), **Next.js Frontend** (Vercel), **Cloud MySQL** (Google Cloud SQL / Aiven), **AWS S3**, and **Firebase Authentication**.

---

## Architecture Overview

```
                      ┌───────────────────────────────────────┐
                      │             Clients                   │
                      │  (Web Browser / Mobile Web Scanner)   │
                      └──────────────────┬────────────────────┘
                                         │ HTTPS
                      ┌──────────────────▼────────────────────┐
                      │        Vercel (Frontend CDN)          │
                      │       Next.js 16 / TypeScript         │
                      └──────────────────┬────────────────────┘
                                         │ API Requests (Bearer Token)
                      ┌──────────────────▼────────────────────┐
                      │    Backend Service (Render — Docker)  │
                      │   FastAPI + Uvicorn on $PORT          │
                      │  - Tesseract OCR + Poppler Utilities  │
                      │  - libmagic (MIME validation)         │
                      │  - SpaCy en_core_web_sm NLP           │
                      │  - Diff Engine (lease verification)   │
                      └────┬─────────────┬──────────────┬─────┘
                           │             │              │
                           │ SQL (Async) │ S3 API       │ Token Verify
                           ▼             ▼              ▼
                 ┌──────────────┐  ┌───────────┐  ┌──────────┐
                 │ Google Cloud │  │  AWS S3   │  │ Firebase │
                 │  SQL MySQL   │  │ (Redacted │  │   Auth   │
                 │   8.0        │  │  Leases)  │  │          │
                 └──────────────┘  └───────────┘  └──────────┘
```

---

## 1. Prerequisites & Accounts

Before starting, ensure you have accounts on these services:

| Service | Purpose | Recommended Tier |
| :--- | :--- | :--- |
| **[Render](https://render.com)** | Hosts the dockerized backend (OCR + SpaCy + libmagic) | Starter ($7/mo) or Free |
| **[Vercel](https://vercel.com)** | Hosts the Next.js 16 frontend | Hobby (Free) / Pro |
| **[Google Cloud SQL](https://cloud.google.com/sql)** | Managed MySQL 8.0 database | `db-f1-micro` (Free tier eligible) |
| **[AWS S3](https://aws.amazon.com/s3/)** | Encrypted storage for redacted lease extractions | Standard S3 |
| **[Firebase](https://console.firebase.google.com)** | Authentication & user management | Spark (Free) / Blaze |
| **[Google AI Studio](https://aistudio.google.com)** | Gemini API key for clause Q&A | Free tier |
| **GitHub** | Source code repository (Render deploys from here) | Free |

---

## 2. Backend Deployment on Render (Docker)

### Why Docker is Required

The ClauseGuard backend depends on **system-level packages** that Render's native Python environment does **not** include:

| System Dependency | Python Package | Purpose |
| :--- | :--- | :--- |
| `tesseract-ocr` | `pytesseract` | OCR engine for scanned lease PDFs |
| `poppler-utils` | `pdf2image` | Converts PDF pages to images for OCR |
| **`libmagic1`** | **`python-magic`** | **MIME-type validation for uploads (D5)** |
| — | `spacy` + `en_core_web_sm` | NLP model for PII entity detection & redaction |

> [!CAUTION]
> **The `libmagic` Gotcha**: Without `libmagic1` installed at the OS level, `python-magic` will crash with `ImportError: failed to find libmagic` on container startup. You **must** deploy with Docker, not Render's native Python runtime.

### Step 2.1: Dockerfile (Already Configured)

The production Dockerfile is at `Development/backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# System dependencies: OCR, PDF rendering, MIME detection
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    poppler-utils \
    libmagic1 \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Bake the SpaCy NLP model into the image
RUN python -m spacy download en_core_web_sm

COPY . .

# Render injects $PORT dynamically (default 10000)
EXPOSE ${PORT:-10000}

# Auto-migrate database, then start Uvicorn on Render's assigned port
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
```

> [!IMPORTANT]
> **Render does NOT use port 8000.** It assigns the port dynamically via the `$PORT` environment variable (default `10000`). The Dockerfile uses `${PORT:-10000}` so it works on both Render and local Docker.

### Step 2.2: Dockerignore

Ensure `Development/backend/.dockerignore` excludes development artefacts:
```
.venv/
__pycache__/
*.py[cod]
*$py.class
*.so
.env
.DS_Store
.pytest_cache/
.coverage
htmlcov/
.mypy_cache/
.ruff_cache/
tests/
```

### Step 2.3: Deploy on Render — Step by Step

#### 1. Push to GitHub
```bash
cd /path/to/ClauseGuard
git add .
git commit -m "feat(backend): production Dockerfile with libmagic, Render PORT binding"
git push origin main
```

#### 2. Create the Web Service
1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** → **Web Service**.
3. Select **Build and deploy from a Git repository**.
4. Connect your `ClauseGuard` GitHub repository.

#### 3. Configure Service Settings

| Setting | Value |
| :--- | :--- |
| **Name** | `clauseguard-api` |
| **Region** | `Frankfurt (EU Central)` *(closest to Ireland)* |
| **Root Directory** | `Development/backend` |
| **Runtime** | **Docker** *(critical — do NOT select "Python")* |
| **Instance Type** | **Starter** ($7/mo, 512 MB RAM) or **Free** (see cold-start warning below) |
| **Health Check Path** | `/health` |

#### 4. Upload Firebase Credentials as a Secret File
1. In the service settings, go to the **Secret Files** tab.
2. Click **Add Secret File**.
3. **Filename**: `firebase-service-account.json`
4. **Contents**: Paste the entire JSON contents of your Firebase service account key file.
5. Render mounts this at `/etc/secrets/firebase-service-account.json` inside the container.

#### 5. Configure Environment Variables
In the **Environment** tab, add each variable:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `DATABASE_URL` | `mysql+aiomysql://clauseguard_user:<pw>@<CLOUD_SQL_IP>:3306/clauseguard` | Async connection (FastAPI runtime) |
| `DATABASE_URL_SYNC` | `mysql+pymysql://clauseguard_user:<pw>@<CLOUD_SQL_IP>:3306/clauseguard` | Sync connection (Alembic migrations) |
| `ALLOWED_ORIGINS` | `https://clauseguard.vercel.app` | **No wildcards** — exact Vercel production URL |
| `FIREBASE_CREDENTIALS_JSON` | `/etc/secrets/firebase-service-account.json` | Points to the Secret File mounted above |
| `FIREBASE_WEB_API_KEY` | `AIzaSy...` | From Firebase → Project Settings → General |
| `AWS_ACCESS_KEY_ID` | `AKIA...` | IAM user with S3 `PutObject/GetObject/DeleteObject` |
| `AWS_SECRET_ACCESS_KEY` | `wJalrXUtn...` | Corresponding IAM secret key |
| `AWS_REGION` | `eu-north-1` | S3 bucket region |
| `S3_BUCKET_NAME` | `clauseguard-leases-prod` | Your production S3 bucket name |
| `GEMINI_API_KEY` | `AIzaSy...` | Google AI Studio key for clause Q&A |
| `RATE_LIMIT_API` | `60/minute` | Standard endpoint rate limit |
| `RATE_LIMIT_AUTH` | `10/minute` | Auth endpoint rate limit |

> [!TIP]
> **Firebase Credentials**: Ensure the `FIREBASE_CREDENTIALS_JSON` points to the **exact same Firebase project** that your Vercel frontend is configured to use. Mismatched projects will cause all Bearer token validation to fail with 401 errors.

#### 6. Deploy
1. Click **Create Web Service**.
2. Render will:
   - Clone your repo
   - Build the Docker image (installs tesseract, poppler, libmagic, pip packages, SpaCy model)
   - Run `alembic upgrade head` to apply all migrations (0001 → 0004)
   - Start Uvicorn on `$PORT`
3. Wait for the **"Live"** badge in Render logs. This confirms the health check at `/health` is returning `200 OK`.
4. Your backend URL will be: `https://clauseguard-api.onrender.com`

---

## 3. Database Setup (Google Cloud SQL for MySQL)

### Step 3.1: Create the Cloud SQL Instance

1. In [Google Cloud Console](https://console.cloud.google.com), navigate to **Cloud SQL** → **Create Instance** → Choose **MySQL**.
2. Configure:
   - **Database version**: `MySQL 8.0`
   - **Instance ID**: `clauseguard-db`
   - **Root password**: Set a strong password.
   - **Machine Type**: `db-f1-micro` (shared core, 0.6 GB — low cost for dissertation) or `db-g1-small` (1.7 GB for production).
   - **Storage**: SSD, 10 GB, enable *Automatic storage increases*.
   - **Region**: `europe-west1` (Belgium) — closest to Ireland.

### Step 3.2: Configure Networking

Since Render uses dynamic outbound IPs, you need to allow external connections:

1. Go to **Connections** tab → **Networking**.
2. Enable **Public IP**.
3. Under **Authorized networks** → **Add Network**:
   - **Name**: `Render Backend`
   - **Network**: `0.0.0.0/0` *(allows any IP — secured by password + SSL)*
4. Under **Security**: Set SSL mode to **"Allow only SSL connections"** for encryption in transit.

> [!WARNING]
> Using `0.0.0.0/0` is acceptable for a dissertation project with strong passwords and SSL enforcement. For enterprise production, use the **Cloud SQL Auth Proxy** sidecar or deploy the backend to **Google Cloud Run** with private IP connectivity.

### Step 3.3: Create Database & Application User

1. **Databases** tab → **Create Database**:
   - Name: `clauseguard`
   - Character set: `utf8mb4`
   - Collation: `utf8mb4_unicode_ci`
2. **Users** tab → **Add User Account**:
   - Username: `clauseguard_user`
   - Password: Generate a strong password
   - Host: `%` (allow from any host)

### Step 3.4: Format Connection Strings

Replace `<PASSWORD>` and `<CLOUD_SQL_PUBLIC_IP>` (visible on the Cloud SQL Overview page):

```env
# Async — for FastAPI runtime (aiomysql driver)
DATABASE_URL=mysql+aiomysql://clauseguard_user:<PASSWORD>@<CLOUD_SQL_PUBLIC_IP>:3306/clauseguard

# Sync — for Alembic CLI migrations (PyMySQL driver)
DATABASE_URL_SYNC=mysql+pymysql://clauseguard_user:<PASSWORD>@<CLOUD_SQL_PUBLIC_IP>:3306/clauseguard
```

### Alternative: Aiven / Railway / AWS RDS
1. Provision a MySQL 8.0 instance.
2. Note: Host, Port (`3306`), User, Password, Database (`clauseguard`).
3. Connection strings follow the same pattern with `?ssl_verify_cert=true`.

---

## 4. AWS S3 Setup (Redacted Lease Storage)

1. Log in to **AWS Console** → **S3** → **Create Bucket**.
2. Bucket name: `clauseguard-leases-prod`
3. Region: `eu-north-1` (or region closest to your users).
4. **Block all public access**: ✅ Enabled (files are accessed only via backend SDK).
5. Create an **IAM User** or **IAM Policy** with permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
       "Resource": "arn:aws:s3:::clauseguard-leases-prod/*"
     }]
   }
   ```
6. Generate an **Access Key ID** and **Secret Access Key** for this IAM user.

> [!NOTE]
> **Upload Limits**: Render's load balancers allow payloads up to **100 MB** by default. ClauseGuard enforces a **25 MB** application-level cap, so uploads will never be blocked by Render's proxy.

---

## 5. Firebase Authentication Setup

1. Open [Firebase Console](https://console.firebase.google.com) → Select your ClauseGuard project.
2. **Authentication** → **Sign-in method** → Enable **Email/Password**.
3. **Project Settings** → **Service accounts** → **Generate new private key**.
4. Download the JSON file. You will either:
   - Upload it as a **Render Secret File** (recommended), or
   - Paste the JSON content inline in the `FIREBASE_CREDENTIALS_JSON` env var.
5. **Project Settings** → **General** → Copy the **Web API Key** for the `FIREBASE_WEB_API_KEY` env var.

> [!IMPORTANT]
> The Firebase project used here **must match** the one configured in the Vercel frontend's `NEXT_PUBLIC_FIREBASE_*` environment variables. Using different Firebase projects between frontend and backend is the #1 cause of `401 Unauthorized` errors.

---

## 6. Frontend Deployment (Vercel)

1. Sign in to [Vercel](https://vercel.com) with GitHub.
2. Click **Add New** → **Project** → Select `ClauseGuard` repo.
3. Configure build settings:
   - **Root Directory**: `Development/frontend`
   - **Framework Preset**: `Next.js`
   - **Node.js Version**: `20.x` or `22.x`
   - **Build Command**: `npm run build`
   - **Install Command**: `npm install`
4. Configure Environment Variables:
   ```env
   NEXT_PUBLIC_API_URL=https://clauseguard-api.onrender.com/api
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=clauseguard-....firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=clauseguard-...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=clauseguard-....appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```
5. Click **Deploy**. Vercel assigns a domain (e.g., `https://clauseguard.vercel.app`).
6. **Go back to Render** → Update `ALLOWED_ORIGINS` to include your Vercel URL.

---

## 7. Post-Deployment Verification Checklist

Run through every item before the MSc presentation:

- [ ] **Health Endpoint**: `curl https://clauseguard-api.onrender.com/health` → `{"status":"ok"}`
- [ ] **Swagger Docs**: Open `https://clauseguard-api.onrender.com/docs` → All 24 `/api` endpoints visible
- [ ] **CORS**: Open frontend in browser → No `Access-Control-Allow-Origin` console errors
- [ ] **Database**: `GET /api/analyses` returns `200` (confirms migration 0004 applied)
- [ ] **Lease Upload & Diff Engine**: Upload a test PDF → verify `201` response, S3 object created, diff engine validates it's a lease
- [ ] **Non-Lease Rejection**: Upload a random image/document → verify `422 Unprocessable Entity` with message about invalid lease
- [ ] **Notice Checker**: `POST /api/notices` with sample termination notice → statutory checks return
- [ ] **Clause Q&A**: `POST /api/analyses/{id}/clauses/{clause_id}/questions` → Gemini-powered answer returns
- [ ] **Firebase Auth Flow**: Register/login via frontend → verify token is accepted by backend

---

## 8. Presentation Day: Cold Start Warning

> [!WARNING]
> **Free Tier Cold Starts (Task D7)**: If you are using Render's **Free** tier, the instance **spins down after 15 minutes of inactivity**. When cold-starting, the container must:
> 1. Rebuild the process
> 2. Load the SpaCy model (~15 MB)
> 3. Run `alembic upgrade head` (checks migration state)
> 4. Start Uvicorn
>
> This takes **30–60 seconds**. During the MSc presentation (Shubham, Karthik, Prasad, Jude), **have someone on the team load the frontend app 2–3 minutes before you start speaking** to wake the container. Otherwise, the first OCR request will time out.
>
> **Paid Starter tier ($7/mo)** eliminates cold starts entirely — the container stays warm 24/7. Recommended for presentation day.

---

## 9. Quick Reference: Full Environment Variables

### Backend (Render)

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | `mysql+aiomysql://...` (async, FastAPI runtime) |
| `DATABASE_URL_SYNC` | `mysql+pymysql://...` (sync, Alembic migrations) |
| `ALLOWED_ORIGINS` | Exact Vercel URL (no wildcards) |
| `FIREBASE_CREDENTIALS_JSON` | `/etc/secrets/firebase-service-account.json` |
| `FIREBASE_WEB_API_KEY` | Firebase Web API key |
| `AWS_ACCESS_KEY_ID` | IAM access key for S3 |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key for S3 |
| `AWS_REGION` | S3 bucket region (e.g. `eu-north-1`) |
| `S3_BUCKET_NAME` | S3 bucket name |
| `GEMINI_API_KEY` | Google AI Studio key |
| `RATE_LIMIT_API` | `60/minute` |
| `RATE_LIMIT_AUTH` | `10/minute` |

### Frontend (Vercel)

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://<render-url>/api` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `<project>.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `<project>.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
