# ClauseGuard — API Integration & Frontend Developer Guide

This document details all available API endpoints, authentication flows, request/response contracts, and ready-to-use TypeScript/React integration examples for the Next.js frontend and Postman.

---

## 1. Authentication & Base Setup

All protected endpoints require an `Authorization` header containing a valid Firebase ID token:
```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

### Central API Client (`Development/frontend/lib/api.ts`)

```typescript
import { auth } from './firebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.detail || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}
```

---

## 2. API Endpoints Catalog

### Summary Table

| Category | Method | Path | Summary | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/register` | Register new user profile in MySQL | Yes |
| **Auth** | `POST` | `/api/auth/logout` | Revoke tokens & audit logout | Yes |
| **Auth** | `POST` | `/api/auth/forgot-password` | Send password reset link | No |
| **Analyses** | `GET` | `/api/analyses` | List user lease analyses with status counts | Yes |
| **Analyses** | `POST` | `/api/analyses` | Upload lease PDF/image (Diff Engine + OCR + Redaction) | Yes |
| **Analyses** | `DELETE`| `/api/analyses` | Delete all analyses and wipe S3 files | Yes |
| **Analyses** | `GET` | `/api/analyses/{id}` | Get full clause-by-clause review & scores | Yes |
| **Analyses** | `PATCH`| `/api/analyses/{id}/clauses/{clause_id}` | Mark clause as reviewed (`{ reviewed: true }`) | Yes |
| **Analyses** | `POST` | `/api/analyses/{id}/clauses/{clause_id}/questions` | Ask AI legal question about a specific clause | Yes |
| **Notices** | `GET` | `/api/notices` | List landlord notice compliance checks | Yes |
| **Notices** | `POST` | `/api/notices` | Check notice (Termination, RPZ Rent Review, Entry) | Yes |
| **Notices** | `GET` | `/api/notices/{id}` | Get full notice evaluation, checks, & next steps | Yes |
| **Events** | `GET` | `/api/events` | List tenancy timeline milestones | Yes |
| **Events** | `POST` | `/api/events` | Create new timeline event | Yes |
| **Events** | `PATCH`| `/api/events/{id}` | Toggle event completion (`{ done: true }`) | Yes |
| **Events** | `DELETE`| `/api/events/{id}` | Delete a timeline event | Yes |
| **Account** | `GET` | `/api/me` | Get current user profile | Yes |
| **Account** | `DELETE`| `/api/me` | Cascading account deletion (GDPR purge) | Yes |
| **Account** | `GET` | `/api/me/gdpr-export` | Export stored user data (GDPR Art. 15) | Yes |
| **Preferences**| `GET` | `/api/me/preferences` | Get user explanation detail and reminder settings | Yes |
| **Preferences**| `PATCH`| `/api/me/preferences` | Update user preferences | Yes |
| **Dev** | `POST` | `/api/dev/token` | Get test Bearer token by email/password | No |
| **Dev** | `POST` | `/api/dev/token-by-uid` | Get test Bearer token by Firebase UID | No |
| **Health** | `GET` | `/health` (at root) | System liveness probe | No |

---

## 3. Detailed Endpoint Specs

### 3.1 Upload Lease Document (`POST /api/analyses`)
Uploads a lease document (PDF or image). Automatically:
1. Validates that the file is legitimately a residential tenancy agreement via the **Template Diff Engine**.
2. Performs OCR text extraction.
3. Redacts PII using SpaCy entity recognition and Irish regex patterns.
4. Uploads redacted text to S3 and initializes clause review data.

* **Content-Type**: `multipart/form-data`
* **Form Field**: `file` (File blob)
* **Accepted Formats**: `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.tiff`, `.bmp`, `.docx`
* **Maximum Size**: 25 MB

#### Response (`201 Created`):
```json
{
  "id": "7bfa168a-cf2a-43cf-8302-69022e399589",
  "message": "Lease document uploaded and analyzed successfully.",
  "fileName": "lease.pdf",
  "fileSizeBytes": 1048576,
  "status": "completed",
  "s3Key": "documents/uid/uuid.txt",
  "charCount": 2400,
  "counts": {
    "red": 1,
    "amber": 1,
    "green": 1,
    "grey": 0
  }
}
```

---

### 3.2 Get Clause-by-Clause Analysis (`GET /api/analyses/{id}`)
Retrieves full legal audit with status colors (`red`, `amber`, `green`, `grey`), plain-English explanations, and RTB citations in camelCase.

#### Response (`200 OK`):
```json
{
  "id": "7bfa168a-cf2a-43cf-8302-69022e399589",
  "fileName": "lease.pdf",
  "createdAt": "2026-10-21T10:00:00Z",
  "propertyAddress": "123 Main St, Dublin",
  "monthlyRentCents": 210000,
  "depositCents": 210000,
  "tenancyStart": "2026-04-01",
  "termMonths": 12,
  "pageCount": 3,
  "counts": {
    "red": 1,
    "amber": 1,
    "green": 1,
    "grey": 0
  },
  "clauses": [
    {
      "id": "clause-uuid",
      "number": "1",
      "title": "Right of Entry Without Notice",
      "text": "The landlord may enter at any time without prior notice.",
      "page": 1,
      "status": "red",
      "confidence": "high",
      "explanation": "Irish law requires at least 24 hours written notice before entry.",
      "reason": "Violates Section 12(1)(a) of Residential Tenancies Act 2004.",
      "nextSteps": ["Request clause amendment to require 24 hours notice."],
      "sources": [
        {
          "kind": "legislation",
          "title": "Residential Tenancies Act 2004",
          "url": "https://www.irishstatutebook.ie/eli/2004/act/27/section/12/enacted/en/html",
          "note": "Section 12(1)(a) — Peaceful occupation"
        }
      ],
      "reviewed": false
    }
  ]
}
```

---

### 3.3 Ask AI Legal Question About a Clause (`POST /api/analyses/{id}/clauses/{clause_id}/questions`)
Submits a user question isolated to a specific clause. Returns plain-text guidance grounded in Irish tenancy law.

#### Request:
```json
{
  "question": "Can the landlord really enter without telling me?",
  "history": []
}
```

#### Response (`200 OK`):
```json
{
  "answer": "No. Under Section 12 of the Residential Tenancies Act 2004, you have a statutory right to peaceful occupation. Except in genuine emergencies, the landlord must give you at least 24 hours advance written notice."
}
```

---

### 3.4 Submit Notice Verification (`POST /api/notices`)
Evaluates landlord notice compliance against Irish statutory rules (Termination notices, March 2026 RPZ Rent Review rules, and 24h Entry notices).

#### Request:
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

#### Response (`201 Created`):
```json
{
  "id": "notice-check-uuid"
}
```

---

## 4. Standardized Error Handling

All error responses across the API are guaranteed to follow the unified envelope:
```json
{
  "message": "Descriptive human-readable error explanation."
}
```
No internal stack traces or database driver details are leaked to clients.
