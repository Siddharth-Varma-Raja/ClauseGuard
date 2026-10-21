# ClauseGuard Identity & Analysis API — Complete Documentation & Postman Guide

This document provides complete technical specifications for all API endpoints in the **ClauseGuard Backend**, along with step-by-step instructions for testing each endpoint using **Postman**.

---

## 1. Environment & Architecture Overview

* **Base URL:** `http://127.0.0.1:8000`
* **Interactive OpenAPI Docs (Swagger UI):** `http://127.0.0.1:8000/docs`
* **ReDoc Documentation:** `http://127.0.0.1:8000/redoc`
* **Database:** MySQL 8.0+ (`clauseguard` database, Alembic migration head `0004`)
* **Auth Provider:** Firebase Authentication (Project ID: `clauseguard-d6e96`)
* **Base API Path:** `/api` (unified with frontend `NEXT_PUBLIC_API_URL`)

### Authentication Model
1. **Public Endpoints (`/health`, `/api/auth/register`, `/api/auth/forgot-password`, `/api/dev/token`):** Do not require a Bearer token in the `Authorization` header.
2. **Protected Endpoints (`/api/analyses`, `/api/notices`, `/api/events`, `/api/me`, etc.):** Require a valid Firebase JWT ID Token passed in the HTTP Authorization header:
   ```text
   Authorization: Bearer <FIREBASE_ID_TOKEN>
   ```

---

## 2. API Endpoints Summary

| Method | Endpoint | Auth Required | Description |
| :---: | :--- | :---: | :--- |
| `GET` | `/health` | No | Liveness health probe |
| `POST` | `/api/auth/register` | No (Validates UID) | Registers a new user profile in MySQL |
| `POST` | `/api/auth/logout` | **Yes** (Bearer Token) | Revokes user refresh tokens & logs audit event |
| `POST` | `/api/auth/forgot-password` | No | Sends password reset email via Firebase |
| `GET` | `/api/analyses` | **Yes** (Bearer Token) | Lists user's lease analyses with status counts |
| `POST` | `/api/analyses` | **Yes** (Bearer Token) | Uploads lease (Diff Engine + OCR + Redaction + S3) |
| `GET` | `/api/analyses/{id}` | **Yes** (Bearer Token) | Retrieves full clause-by-clause legal review (camelCase) |
| `PATCH` | `/api/analyses/{id}/clauses/{clause_id}` | **Yes** (Bearer Token) | Marks clause as reviewed (`{ "reviewed": true }`) |
| `POST` | `/api/analyses/{id}/clauses/{clause_id}/questions` | **Yes** (Bearer Token) | Ask AI targeted legal question about a clause |
| `DELETE` | `/api/analyses` | **Yes** (Bearer Token) | Soft-deletes all analyses and purges S3 files |
| `GET` | `/api/notices` | **Yes** (Bearer Token) | Lists landlord notice evaluations |
| `POST` | `/api/notices` | **Yes** (Bearer Token) | Submits notice check (Termination, Rent, Entry) |
| `GET` | `/api/notices/{id}` | **Yes** (Bearer Token) | Retrieves notice verdict, statutory checks, & next steps |
| `GET` | `/api/events` | **Yes** (Bearer Token) | Lists tenancy timeline milestones |
| `POST` | `/api/events` | **Yes** (Bearer Token) | Creates new tenancy timeline event |
| `PATCH` | `/api/events/{id}` | **Yes** (Bearer Token) | Toggles event completion (`{ "done": true }`) |
| `DELETE` | `/api/events/{id}` | **Yes** (Bearer Token) | Deletes a tenancy timeline event |
| `GET` | `/api/me/preferences` | **Yes** (Bearer Token) | Gets explanation detail and reminder settings |
| `PATCH` | `/api/me/preferences` | **Yes** (Bearer Token) | Updates user preferences |
| `GET` | `/api/me` | **Yes** (Bearer Token) | Fetches the current user profile |
| `DELETE` | `/api/me` | **Yes** (Bearer Token) | Cascading account deletion (GDPR purge) |
| `GET` | `/api/me/gdpr-export` | **Yes** (Bearer Token) | Exports user profile & audit history (GDPR Art. 15) |
| `POST` | `/api/dev/token` | No | Generates test Bearer token by email/password |
| `POST` | `/api/dev/token-by-uid` | No | Generates test Bearer token by Firebase UID |

---

## 3. Detailed Postman Testing Reference

### 1. Health Check
* **Method:** `GET`
* **URL:** `http://127.0.0.1:8000/health`
* **Response (`200 OK`):**
  ```json
  {
    "status": "ok"
  }
  ```

---

### 2. Generate Development Token (`POST /api/dev/token-by-uid`)
Quickly obtain a test Bearer token without needing a password:
* **Method:** `POST`
* **URL:** `http://127.0.0.1:8000/api/dev/token-by-uid`
* **Body (`raw` JSON):**
  ```json
  {
    "firebase_uid": "glJb2C98eBQcMawvNIGU34xk3jn2"
  }
  ```
* **Response (`200 OK`):**
  ```json
  {
    "id_token": "eyJhbGciOiJSUzI1NiIs...",
    "refresh_token": "...",
    "expires_in": "3600",
    "message": "Use the id_token as your Bearer token in Postman."
  }
  ```

---

### 3. Upload Lease (`POST /api/analyses`)
* **Method:** `POST`
* **URL:** `http://127.0.0.1:8000/api/analyses`
* **Authorization:** `Bearer <TOKEN>`
* **Body:** Select `form-data`
  * Key: `file` (Type: **File**)
  * Value: Choose a PDF or Image lease file
* **Response (`201 Created`):**
  ```json
  {
    "id": "7bfa168a-cf2a-43cf-8302-69022e399589",
    "message": "Lease document uploaded and analyzed successfully.",
    "fileName": "lease.pdf",
    "fileSizeBytes": 1048576,
    "status": "completed",
    "counts": {
      "red": 1,
      "amber": 1,
      "green": 1,
      "grey": 0
    }
  }
  ```

---

### 4. Get Analysis (`GET /api/analyses/{id}`)
* **Method:** `GET`
* **URL:** `http://127.0.0.1:8000/api/analyses/<ID>`
* **Authorization:** `Bearer <TOKEN>`
* **Response (`200 OK`):** Full clause-by-clause analysis with risk statuses (`red`, `amber`, `green`, `grey`), plain-English explanations, and RTB citations.

---

### 5. Check Notice (`POST /api/notices`)
* **Method:** `POST`
* **URL:** `http://127.0.0.1:8000/api/notices`
* **Authorization:** `Bearer <TOKEN>`
* **Body (`raw` JSON):**
  ```json
  {
    "type": "rent",
    "answers": {
      "noticeDays": 90,
      "inRpz": true,
      "currentRent": 2000,
      "newRent": 2040,
      "monthsSinceLastReview": 12,
      "hasThreeComparables": true
    }
  }
  ```
* **Response (`201 Created`):**
  ```json
  {
    "id": "notice-check-id"
  }
  ```

---

## 4. Error Format

Every error returned by the server uses the standardized format:
```json
{
  "message": "Descriptive error message"
}
```
