# ClauseGuard — API Integration & Frontend Developer Guide

This document details all available API endpoints, authentication flows, request/response contracts, and ready-to-use TypeScript/React integration examples for the Next.js frontend.

---

## 1. Authentication & Base Setup

All protected endpoints require an `Authorization` header containing a valid Firebase ID token:
```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

### Central API Client (`lib/api.ts`)

Create this helper in your frontend (`Development/frontend/lib/api.ts`) to automatically attach tokens and parse errors:

```typescript
import { auth } from './firebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

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
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}
```

---

## 2. API Endpoints Catalog

### Summary Table

| Category | Method | Path | Summary | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/auth/register` | Register new user profile in MySQL | Yes |
| **Auth** | `POST` | `/auth/logout` | Revoke tokens & audit logout | Yes |
| **Auth** | `POST` | `/auth/forgot-password` | Send password reset link | No |
| **Account**| `GET` | `/account/me` | Get current user profile | Yes |
| **Account**| `PATCH`| `/account/me` | Update name / preferences | Yes |
| **Account**| `DELETE`| `/account/me` | Soft-delete account & anonymize | Yes |
| **Account**| `GET` | `/account/me/gdpr-export`| Export all stored GDPR data | Yes |
| **Documents**| `POST`| `/documents/upload` | Upload PDF or Image lease | Yes |
| **Documents**| `GET` | `/documents/` | Paginated list of user documents | Yes |
| **Documents**| `GET` | `/documents/{id}` | Get document metadata & status | Yes |
| **Documents**| `DELETE`| `/documents/{id}`| Soft-delete a document | Yes |
| **Doc Review**| `GET` | `/docreview/{document_id}` | Full clause-by-clause review & scores | Yes |
| **Doc Review**| `PATCH`| `/docreview/clause/{clause_id}`| Mark clause as reviewed | Yes |
| **Doc Review**| `DELETE`| `/docreview/{document_id}` | Delete a document review | Yes |
| **Doc Review**| `POST` | `/docreview/` | Submit ML review (internal/service) | No |
| **Chat** | `POST` | `/chat/ask` | Ask AI about a lease & legal rights | Yes |
| **Chat** | `GET` | `/chat/history/{document_id}` | Get chat message history | Yes |
| **Chat** | `DELETE`| `/chat/history/{document_id}`| Clear chat history for document | Yes |
| **Dev** | `POST` | `/dev/token` | Generate test auth token (dev only) | No |
| **Health** | `GET` | `/health` (at root `/health`) | System liveness probe | No |

---

## 3. Detailed Endpoint Specs & Examples

### 3.1 Document Upload (`POST /documents/upload`)
Uploads a document (text PDF, scanned PDF, or image). Automatically runs OCR (if needed), redacts PII using SpaCy, uploads redacted text to S3, and saves metadata to MySQL.

* **Content-Type**: `multipart/form-data`
* **Form Field**: `file` (File blob)
* **Accepted Formats**: `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.tiff`, `.bmp`
* **Maximum Size**: 20 MB

#### Frontend Example:
```typescript
export async function uploadLeaseDocument(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return apiRequest<DocumentUploadResponse>('/documents/upload', {
    method: 'POST',
    body: formData,
  });
}
```

#### Success Response (`201 Created`):
```json
{
  "message": "Document processed and uploaded successfully.",
  "document": {
    "id": "0d63075e-d03e-45da-a6e6-abdcedc3752d",
    "user_id": "8a91cbf7-0624-4f0f-8c34-b25fbefd0319",
    "original_filename": "residential_lease_agreement.pdf",
    "content_type": "application/pdf",
    "file_size_bytes": 1048576,
    "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "status": "COMPLETED",
    "s3_key": "documents/residential_lease_agreement_abc123.txt",
    "s3_uri": "s3://clauseguard-bucket/documents/residential_lease_agreement_abc123.txt",
    "char_count": 8420,
    "is_deleted": false,
    "created_at": "2026-10-19T14:30:00Z",
    "updated_at": "2026-10-19T14:30:05Z"
  }
}
```

---

### 3.2 List Documents (`GET /documents/`)
Retrieves a paginated list of documents owned by the active user.

* **Query Parameters**:
  - `page` (integer, default: `1`)
  - `page_size` (integer, default: `10`, max: `50`)
  - `status_filter` (string, optional: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`)

#### Success Response (`200 OK`):
```json
{
  "documents": [
    {
      "id": "0d63075e-d03e-45da-a6e6-abdcedc3752d",
      "original_filename": "residential_lease_agreement.pdf",
      "status": "COMPLETED",
      "char_count": 8420,
      "created_at": "2026-10-19T14:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 10
}
```

---

### 3.3 Document Review & Analysis (`GET /docreview/{document_id}`)
Fetches the full legal audit of the lease, categorized by clause and mapped to Irish RTB legal standards.

#### TypeScript Types:
```typescript
export interface ClauseSource {
  id: string;
  source_type: 'legislation' | 'rtb_guidance' | 'case_law' | 'other';
  source_name: string;
  act_name: string | null;
  description: string | null;
  link: string | null;
}

export interface ClauseReview {
  id: string;
  clause_number: number;
  clause_title: string;
  clause_text: string;
  risk_level: 'likely_unenforceable' | 'needs_review' | 'compliant' | 'informational';
  color_code: string; // e.g. '#DC2626' (Red), '#EAB308' (Yellow), '#16A34A' (Green)
  plain_english: string | null;
  flagging_reason: string | null;
  suggested_steps: string[] | null;
  is_reviewed: boolean;
  sources: ClauseSource[];
  created_at: string;
  updated_at: string;
}

export interface DocumentReviewResponse {
  id: string;
  document_id: string;
  review_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  summary: {
    total_clauses: number;
    likely_unenforceable_count: number;
    needs_review_count: number;
    compliant_count: number;
    informational_count: number;
  };
  clauses: ClauseReview[];
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}
```

#### Frontend Example:
```typescript
export async function getDocumentReview(documentId: string): Promise<DocumentReviewResponse> {
  return apiRequest<DocumentReviewResponse>(`/docreview/${documentId}`);
}
```

#### Sample Response (`200 OK`):
```json
{
  "id": "e8a9310a-313e-4b68-b788-29ef3189da10",
  "document_id": "0d63075e-d03e-45da-a6e6-abdcedc3752d",
  "review_status": "completed",
  "summary": {
    "total_clauses": 12,
    "likely_unenforceable_count": 2,
    "needs_review_count": 3,
    "compliant_count": 7,
    "informational_count": 0
  },
  "clauses": [
    {
      "id": "7b82f059-ff8a-4d43-982c-473926cb3211",
      "clause_number": 4,
      "clause_title": "Landlord Right of Immediate Entry",
      "clause_text": "The Landlord retains the right to inspect the property at any time without prior notice to the Tenant.",
      "risk_level": "likely_unenforceable",
      "color_code": "#DC2626",
      "plain_english": "Under Irish tenancy law, a landlord cannot enter without giving reasonable notice (usually at least 24 hours), except in emergencies.",
      "flagging_reason": "Breaches tenant's statutory right to peaceful and exclusive occupation under Section 16(b) of the Residential Tenancies Act 2004.",
      "suggested_steps": [
        "Request the landlord modify this clause to require at least 24 hours written notice.",
        "Note that statutory tenant rights override any contrary wording in the lease agreement."
      ],
      "is_reviewed": false,
      "sources": [
        {
          "id": "90e38681-420a-40a1-9a7c-a4968439366e",
          "source_type": "legislation",
          "source_name": "Residential Tenancies Act 2004",
          "act_name": "Section 16(b) — Landlord Obligations",
          "description": "Requires landlord to allow tenant peaceful and exclusive occupation.",
          "link": "https://www.irishstatutebook.ie/eli/2004/act/27/section/16/enacted/en/html"
        }
      ],
      "created_at": "2026-10-19T14:35:00Z",
      "updated_at": "2026-10-19T14:35:00Z"
    }
  ],
  "reviewed_at": "2026-10-19T14:35:00Z",
  "created_at": "2026-10-19T14:35:00Z",
  "updated_at": "2026-10-19T14:35:00Z"
}
```

---

### 3.4 Toggle Clause Reviewed State (`PATCH /docreview/clause/{clause_id}`)
Allows tenants or reviewers to check off an item as read or resolved.

* **Request Body**:
  ```json
  {
    "is_reviewed": true
  }
  ```

#### Frontend Example:
```typescript
export async function toggleClauseReviewed(clauseId: string, isReviewed: boolean) {
  return apiRequest<ClauseReview>(`/docreview/clause/${clauseId}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_reviewed: isReviewed }),
  });
}
```

---

### 3.5 AI Assistant & Legal Chat (`POST /chat/ask`)
Sends a query to the AI assistant. Automatically loads the tenant's redacted lease text from S3, checks Irish RTB regulations, generates a plain-English explanation, and persists the conversation.

* **Request Body**:
  ```json
  {
    "document_id": "0d63075e-d03e-45da-a6e6-abdcedc3752d",
    "user_message": "Can the landlord increase my rent after 6 months in a Rent Pressure Zone?",
    "chat_history": [
      {
        "role": "user",
        "content": "Hi, who are you?"
      },
      {
        "role": "model",
        "content": "I am ClauseGuard AI, your Irish tenancy law assistant."
      }
    ]
  }
  ```

#### Success Response (`200 OK`):
```json
{
  "reply": "Based on your lease and Irish tenancy law, no. In Ireland (and specifically Rent Pressure Zones), rent can generally only be reviewed every 24 months, with strict caps (typically the lower of 2% per annum or the Harmonised Index of Consumer Prices). Clause 5 of your agreement does not authorize a 6-month increase, and any such demand violates the Residential Tenancies Acts."
}
```

---

### 3.6 Chat History (`GET /chat/history/{document_id}`)
Retrieves all historical exchanges for this document in chronological order.

#### Success Response (`200 OK`):
```json
{
  "document_id": "0d63075e-d03e-45da-a6e6-abdcedc3752d",
  "total": 2,
  "messages": [
    {
      "id": "18cf1b3c-7554-477d-9a67-d8ebad5713be",
      "document_id": "0d63075e-d03e-45da-a6e6-abdcedc3752d",
      "user_id": "8a91cbf7-0624-4f0f-8c34-b25fbefd0319",
      "role": "user",
      "content": "Can my landlord increase rent after 6 months?",
      "created_at": "2026-10-19T14:40:00Z"
    },
    {
      "id": "3587b1c1-409e-4c07-b2eb-d8d1722cf7b0",
      "document_id": "0d63075e-d03e-45da-a6e6-abdcedc3752d",
      "user_id": "8a91cbf7-0624-4f0f-8c34-b25fbefd0319",
      "role": "model",
      "content": "Based on Irish tenancy law...",
      "created_at": "2026-10-19T14:40:02Z"
    }
  ]
}
```

---

### 3.7 Clear Chat History (`DELETE /chat/history/{document_id}`)
Deletes all stored chat messages for the document.

#### Success Response (`200 OK`):
```json
{
  "message": "Cleared 2 chat messages for document 0d63075e-d03e-45da-a6e6-abdcedc3752d."
}
```
