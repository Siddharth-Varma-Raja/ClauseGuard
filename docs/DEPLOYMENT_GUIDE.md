# ClauseGuard — Deployment Guide

This guide covers production deployment for the **FastAPI Backend**, **Next.js Frontend**, **MySQL Database**, **AWS S3**, and **Firebase Authentication**.

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
                      │       Next.js 14 / TypeScript         │
                      └──────────────────┬────────────────────┘
                                         │ API Requests (Bearer Token)
                      ┌──────────────────▼────────────────────┐
                      │       Backend Service (Render/AWS)    │
                      │   Dockerized FastAPI + Uvicorn        │
                      │  - Tesseract OCR + Poppler Utilities  │
                      │  - SpaCy en_core_web_sm NLP           │
                      └────┬─────────────┬──────────────┬─────┘
                           │             │              │
                           │ SQL (Async) │ S3 API       │ Token Verify
                           ▼             ▼              ▼
                 ┌──────────────┐  ┌───────────┐  ┌──────────┐
                 │ Cloud MySQL  │  │  AWS S3   │  │ Firebase │
                 │ (Aiven/RDS)  │  │ (Redacted │  │   Auth   │
                 │              │  │  Leases)  │  │          │
                 └──────────────┘  └───────────┘  └──────────┘
```

---

## 1. Prerequisites & Services Setup

| Service | Purpose | Recommended Tier |
| :--- | :--- | :--- |
| **Render** / **Railway** | Runs the backend container with OCR & SpaCy | 512MB–1GB RAM instance |
| **Vercel** | Hosts the Next.js Frontend | Hobby (Free) / Pro |
| **Aiven** / **AWS RDS** | Managed MySQL 8.0 database | Free / Micro |
| **AWS S3** | Storage of redacted text extractions | Standard S3 |
| **Firebase** | Authentication & User Management | Spark (Free) / Blaze |

---

## 2. Backend Deployment (Docker Container)

Because the backend relies on system-level OCR tools (`tesseract-ocr`, `poppler-utils`) and SpaCy models, deploying via **Docker** ensures parity between development and production.

### Step 2.1: Production Dockerfile
Create or use `Development/backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies for OCR and PDF rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    poppler-utils \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Download spaCy model for PII entity recognition & redaction
RUN python -m spacy download en_core_web_sm

# Copy project code
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Run Alembic migrations and start Uvicorn
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

### Step 2.2: Dockerignore
Ensure `Development/backend/.dockerignore` contains:
```
.venv/
__pycache__/
*.py[cod]
.env
.DS_Store
.pytest_cache/
.coverage
htmlcov/
tests/
```

### Step 2.3: Deploying on Render (Recommended)
1. Push your repository to GitHub.
2. Sign in to [Render.com](https://render.com) and click **New +** $\rightarrow$ **Web Service**.
3. Connect your repository.
4. Configure service settings:
   - **Root Directory**: `Development/backend`
   - **Runtime**: `Docker`
   - **Instance Type**: Starter (or higher; 512MB RAM recommended for OCR).
5. Add the **Environment Variables** (see Section 4).
6. Click **Create Web Service**. Render builds the image, runs `alembic upgrade head`, and exposes your HTTPS API URL (e.g. `https://clauseguard-api.onrender.com`).

---

## 3. Database Setup (Cloud MySQL)

1. Provision a MySQL 8.0 instance on **Aiven.io**, **Railway**, or **AWS RDS**.
2. Note your connection credentials:
   - Host
   - Port (e.g., `3306`)
   - User
   - Password
   - Database name (`clauseguard`)
3. Format your database connection URLs:
   - **Async (FastAPI runtime)**:
     `mysql+aiomysql://<user>:<password>@<host>:3306/<database>?ssl_verify_cert=true`
   - **Sync (Alembic CLI migrations)**:
     `mysql+pymysql://<user>:<password>@<host>:3306/<database>?ssl_verify_cert=true`

---

## 4. Environment Variables Reference

### Backend Environment Variables (`Development/backend/.env`)

| Variable | Description | Example / Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | Async MySQL connection for FastAPI | `mysql+aiomysql://user:pass@host:3306/clauseguard` |
| `DATABASE_URL_SYNC` | Sync connection for Alembic migrations | `mysql+pymysql://user:pass@host:3306/clauseguard` |
| `ALLOWED_ORIGINS` | Comma-separated allowed frontend domains | `https://clauseguard.vercel.app,http://localhost:3000` |
| `FIREBASE_CREDENTIALS_JSON` | Path to service account file or inline JSON | `./firebase-service-account.json` |
| `FIREBASE_WEB_API_KEY` | Firebase Web API Key for auth validation | `AIzaSy...` |
| `AWS_REGION` | AWS S3 region | `eu-north-1` |
| `AWS_ACCESS_KEY_ID` | IAM User Access Key with S3 permissions | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | IAM User Secret Key | `wJalrXUtn...` |
| `S3_BUCKET_NAME` | Name of your secure S3 Bucket | `clauseguard-bucket` |
| `GEMINI_API_KEY` | Google AI Studio Key for Chat Assistant | `AIzaSy...` |
| `RATE_LIMIT_API` | Standard route rate limit | `60/minute` |
| `RATE_LIMIT_AUTH` | Auth route rate limit | `10/minute` |

> [!TIP]
> **Handling Firebase Credentials in Containerized Cloud**:
> Instead of mounting a physical file, Render and AWS allow you to store the Firebase JSON string directly as an environment variable or secret file mounted at `/etc/secrets/firebase-service-account.json`. Update `FIREBASE_CREDENTIALS_JSON` accordingly.

---

## 5. Frontend Deployment (Vercel)

1. Sign in to [Vercel](https://vercel.com) with GitHub.
2. Click **Add New** $\rightarrow$ **Project**.
3. Select your `ClauseGuard` repo.
4. Set the build parameters:
   - **Root Directory**: Select `Development/frontend`
   - **Framework Preset**: `Next.js`
   - **Build Command**: `npm run build`
   - **Install Command**: `npm install`
5. Configure Environment Variables:
   ```env
   NEXT_PUBLIC_API_URL=https://clauseguard-api.onrender.com/api/v1
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=clauseguard-....firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=clauseguard-...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=clauseguard-....appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```
6. Click **Deploy**. Vercel will assign a public domain (e.g., `https://clauseguard.vercel.app`).
7. Update `ALLOWED_ORIGINS` in your backend environment variables with your Vercel URL.

---

## 6. Post-Deployment Verification Checklist

- [ ] **Health Endpoint**: Run `curl https://<backend-url>/health` $\rightarrow$ returns `{"status": "ok"}`.
- [ ] **Docs Endpoint**: Open `https://<backend-url>/docs` $\rightarrow$ verifies Swagger UI is reachable.
- [ ] **CORS Check**: Inspect browser console on frontend to ensure no `Access-Control-Allow-Origin` errors.
- [ ] **Database Connectivity**: Verify migration `0003` was applied by testing `GET /api/v1/documents/`.
- [ ] **S3 Upload**: Upload a test PDF / image via frontend $\rightarrow$ verify 201 response and S3 object creation.
- [ ] **AI Assistant**: Post a test question to `POST /api/v1/chat/ask` $\rightarrow$ verify Gemini returns RTB guidance.
