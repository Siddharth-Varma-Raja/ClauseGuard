# ClauseGuard Identity API — Complete Documentation & Postman Guide

This document provides complete technical specifications for all API endpoints built in the **ClauseGuard Backend**, along with step-by-step instructions for testing each endpoint using **Postman**.

---

## 1. Environment & Architecture Overview

* **Base URL:** `http://127.0.0.1:8081`
* **Interactive OpenAPI Docs:** `http://127.0.0.1:8081/docs`
* **Database:** MySQL (`clauseguard` database)
* **Auth Provider:** Firebase Authentication (Project ID: `clauseguard-d6e96`)

### Authentication Model
1. **Public Endpoints (`/health`, `/register`, `/forgot-password`):** Do not require a Bearer token in the `Authorization` header.
2. **Protected Endpoints (`/account/me`, `/logout`, etc.):** Require a valid Firebase JWT ID Token passed in the HTTP Authorization header:
   ```text
   Authorization: Bearer <FIREBASE_ID_TOKEN>
   ```

---

## 2. API Endpoints Summary

| Method | Endpoint | Auth Required | Description |
| :---: | :--- | :---: | :--- |
| `GET` | `/health` | No | Liveness health check |
| `POST` | `/api/v1/auth/register` | No (Validates UID) | Registers a new user profile in MySQL |
| `POST` | `/api/v1/auth/forgot-password` | No | Sends a password reset email via Firebase |
| `POST` | `/api/v1/auth/logout` | **Yes** (Bearer Token) | Revokes user refresh tokens & logs audit event |
| `GET` | `/api/v1/account/me` | **Yes** (Bearer Token) | Fetches the current logged-in user profile |
| `PATCH` | `/api/v1/account/me` | **Yes** (Bearer Token) | Updates display name or phone number |
| `GET` | `/api/v1/account/me/gdpr-export` | **Yes** (Bearer Token) | Exports user profile & audit history (GDPR Art. 15) |
| `DELETE` | `/api/v1/account/me` | **Yes** (Bearer Token) | Deactivates user account (GDPR Art. 17) |
| `POST` | `/api/v1/documents/upload` | **Yes** (Bearer Token) | Uploads PDF, redacts PII, saves to S3 & MySQL |
| `GET` | `/api/v1/documents` | **Yes** (Bearer Token) | Lists user's uploaded documents (paginated) |
| `GET` | `/api/v1/documents/{id}` | **Yes** (Bearer Token) | Retrieves metadata for a specific document |
| `DELETE` | `/api/v1/documents/{id}` | **Yes** (Bearer Token) | Soft-deletes a document (audit retained) |

---

## 3. Detailed Endpoint Reference

### 1. Health Check
* **HTTP Method:** `GET`
* **Path:** `/health`
* **Description:** Used by load balancers or uptime monitors to check if the API is active.

#### Request Headers
* None required.

#### Response (`200 OK`)
```json
{
  "status": "ok"
}
```

---

### 2. User Registration
* **HTTP Method:** `POST`
* **Path:** `/api/v1/auth/register`
* **Description:** Called after the user signs up via Firebase on the client side. Verifies that `firebase_uid` exists in Firebase Auth, then creates a row in the `users` table and writes an audit log.

#### Request Headers
* `Content-Type: application/json`

#### Request Body (JSON)
```json
{
  "firebase_uid": "glJb2C98eBQcMawvNIGU34xk3jn2",
  "email": "testuser@clauseguard.com",
  "display_name": "Test User",
  "role": "tenant",
  "gdpr_consent": true
}
```

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `firebase_uid` | `string` | Yes | UID returned by Firebase Auth |
| `email` | `string` | Yes | Valid email address |
| `display_name` | `string` | No | Optional display name |
| `role` | `string` | Yes | Allowed values: `"tenant"`, `"landlord"`, `"admin"` |
| `gdpr_consent` | `boolean` | Yes | Must be `true` |

#### Response (`201 Created`)
```json
{
  "id": "1d5288ee-462c-4c17-8e25-8b91a49e729b",
  "firebase_uid": "glJb2C98eBQcMawvNIGU34xk3jn2",
  "email": "testuser@clauseguard.com",
  "display_name": "Test User",
  "phone_number": null,
  "role": "tenant",
  "is_active": true,
  "gdpr_consent_at": "2026-10-08T16:27:20",
  "created_at": "2026-10-08T16:27:20",
  "updated_at": "2026-10-08T16:27:20"
}
```

#### Common Errors
* `400 Bad Request`: `Firebase UID does not exist. Complete Firebase signup first.`
* `409 Conflict`: `User already registered.`
* `422 Unprocessable Entity`: `GDPR consent is required to create an account.` or invalid role string.

---

### 3. Forgot Password
* **HTTP Method:** `POST`
* **Path:** `/api/v1/auth/forgot-password`
* **Description:** Generates a secure password reset link using Firebase Admin SDK and sends it to the user's email.

#### Query Parameters
* `email` (`string`, required): Target email address (e.g. `?email=user@example.com`).

#### Response (`200 OK`)
```json
{
  "message": "If an account with that email exists, a reset link has been sent."
}
```

---

### 4. Get Current Profile
* **HTTP Method:** `GET`
* **Path:** `/api/v1/account/me`
* **Description:** Retrieves profile information for the authenticated user.

#### Request Headers
* `Authorization: Bearer <FIREBASE_ID_TOKEN>`

#### Response (`200 OK`)
```json
{
  "id": "1d5288ee-462c-4c17-8e25-8b91a49e729b",
  "firebase_uid": "glJb2C98eBQcMawvNIGU34xk3jn2",
  "email": "testuser@clauseguard.com",
  "display_name": "Test User",
  "phone_number": "+447123456789",
  "role": "tenant",
  "is_active": true,
  "gdpr_consent_at": "2026-10-08T16:27:20",
  "created_at": "2026-10-08T16:27:20",
  "updated_at": "2026-10-08T16:27:20"
}
```

---

### 5. Update Profile
* **HTTP Method:** `PATCH`
* **Path:** `/api/v1/account/me`
* **Description:** Partial update of user profile fields (`display_name`, `phone_number`). Writes a `PROFILE_UPDATED` audit log.

#### Request Headers
* `Authorization: Bearer <FIREBASE_ID_TOKEN>`
* `Content-Type: application/json`

#### Request Body (JSON)
```json
{
  "display_name": "Updated Name",
  "phone_number": "+447999888777"
}
```

#### Response (`200 OK`)
```json
{
  "id": "1d5288ee-462c-4c17-8e25-8b91a49e729b",
  "firebase_uid": "glJb2C98eBQcMawvNIGU34xk3jn2",
  "email": "testuser@clauseguard.com",
  "display_name": "Updated Name",
  "phone_number": "+447999888777",
  "role": "tenant",
  "is_active": true,
  "gdpr_consent_at": "2026-10-08T16:27:20",
  "created_at": "2026-10-08T16:27:20",
  "updated_at": "2026-10-08T18:00:00"
}
```

---

### 6. GDPR Data Export
* **HTTP Method:** `GET`
* **Path:** `/api/v1/account/me/gdpr-export`
* **Description:** Exports stored user data for GDPR Article 15 compliance. Writes a `GDPR_EXPORT` audit log.

#### Request Headers
* `Authorization: Bearer <FIREBASE_ID_TOKEN>`

#### Response (`200 OK`)
```json
{
  "user": {
    "id": "1d5288ee-462c-4c17-8e25-8b91a49e729b",
    "firebase_uid": "glJb2C98eBQcMawvNIGU34xk3jn2",
    "email": "testuser@clauseguard.com",
    "display_name": "Updated Name",
    "phone_number": "+447999888777",
    "role": "tenant",
    "is_active": true,
    "gdpr_consent_at": "2026-10-08T16:27:20",
    "created_at": "2026-10-08T16:27:20",
    "updated_at": "2026-10-08T18:00:00"
  },
  "exported_at": "2026-10-08T18:05:00.123456Z"
}
```

---

### 7. Logout / Revoke Session
* **HTTP Method:** `POST`
* **Path:** `/api/v1/auth/logout`
* **Description:** Revokes all Firebase refresh tokens for the current user and writes a `LOGOUT` audit log.

#### Request Headers
* `Authorization: Bearer <FIREBASE_ID_TOKEN>`

#### Response (`200 OK`)
```json
{
  "message": "Session revoked. Please sign in again."
}
```

---

### 8. Deactivate Account
* **HTTP Method:** `DELETE`
* **Path:** `/api/v1/account/me`
* **Description:** Soft-deletes user account by setting `is_active = false`, revokes Firebase refresh tokens, and writes an `ACCOUNT_DEACTIVATED` audit log (GDPR Article 17).

#### Request Headers
* `Authorization: Bearer <FIREBASE_ID_TOKEN>`

#### Response (`200 OK`)
```json
{
  "message": "Account deactivated. Your data is retained for 30 days per GDPR Article 17."
}
---

### 9. Upload Document
* **HTTP Method:** `POST`
* **Path:** `/api/v1/documents/upload`
* **Description:** Uploads a PDF file (max 20 MB). Extracts plain text, runs the redaction pipeline, uploads the redacted text to S3, and saves the file metadata and processing state in MySQL. The original PDF is never stored.
* **Content-Type:** `multipart/form-data`

#### Request Headers
* `Authorization: Bearer <FIREBASE_ID_TOKEN>`

#### Request Body (`form-data`)
* `file`: Binary PDF file (key type: `File`)

#### Response (`201 Created`)
```json
{
  "message": "Document processed and uploaded successfully.",
  "document": {
    "id": "e4b2d189-9a74-4b53-a5c9-94038162e84d",
    "user_id": "1d5288ee-462c-4c17-8e25-8b91a49e729b",
    "original_filename": "sample_tenancy_agreement.pdf",
    "content_type": "application/pdf",
    "file_size_bytes": 1048576,
    "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "s3_key": "documents/sample_tenancy_agreement_a1b2c3d4.txt",
    "s3_uri": "s3://clauseguard-bucket/documents/sample_tenancy_agreement_a1b2c3d4.txt",
    "status": "completed",
    "char_count": 14200,
    "pipeline_error": null,
    "is_deleted": false,
    "created_at": "2026-10-13T10:30:00Z",
    "updated_at": "2026-10-13T10:30:05Z"
  }
}
```

---

### 10. List User Documents
* **HTTP Method:** `GET`
* **Path:** `/api/v1/documents`
* **Description:** Returns a paginated list of all active documents uploaded by the authenticated user, ordered newest first.

#### Request Headers
* `Authorization: Bearer <FIREBASE_ID_TOKEN>`

#### Query Parameters
* `page` *(optional, integer, default: 1)*: 1-indexed page number.
* `page_size` *(optional, integer, default: 20, max: 100)*: Number of items per page.

#### Response (`200 OK`)
```json
{
  "documents": [
    {
      "id": "e4b2d189-9a74-4b53-a5c9-94038162e84d",
      "user_id": "1d5288ee-462c-4c17-8e25-8b91a49e729b",
      "original_filename": "sample_tenancy_agreement.pdf",
      "content_type": "application/pdf",
      "file_size_bytes": 1048576,
      "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "s3_key": "documents/sample_tenancy_agreement_a1b2c3d4.txt",
      "s3_uri": "s3://clauseguard-bucket/documents/sample_tenancy_agreement_a1b2c3d4.txt",
      "status": "completed",
      "char_count": 14200,
      "pipeline_error": null,
      "is_deleted": false,
      "created_at": "2026-10-13T10:30:00Z",
      "updated_at": "2026-10-13T10:30:05Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

---

### 11. Get Document Details
* **HTTP Method:** `GET`
* **Path:** `/api/v1/documents/{document_id}`
* **Description:** Retrieves metadata for a specific document. The document must belong to the authenticated user.

#### Request Headers
* `Authorization: Bearer <FIREBASE_ID_TOKEN>`

#### Path Parameters
* `document_id` *(string, UUID)*: The unique ID of the document.

#### Response (`200 OK`)
```json
{
  "id": "e4b2d189-9a74-4b53-a5c9-94038162e84d",
  "user_id": "1d5288ee-462c-4c17-8e25-8b91a49e729b",
  "original_filename": "sample_tenancy_agreement.pdf",
  "content_type": "application/pdf",
  "file_size_bytes": 1048576,
  "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "s3_key": "documents/sample_tenancy_agreement_a1b2c3d4.txt",
  "s3_uri": "s3://clauseguard-bucket/documents/sample_tenancy_agreement_a1b2c3d4.txt",
  "status": "completed",
  "char_count": 14200,
  "pipeline_error": null,
  "is_deleted": false,
  "created_at": "2026-10-13T10:30:00Z",
  "updated_at": "2026-10-13T10:30:05Z"
}
```

---

### 12. Soft-Delete Document
* **HTTP Method:** `DELETE`
* **Path:** `/api/v1/documents/{document_id}`
* **Description:** Soft-deletes a document (`is_deleted = true`, sets `deleted_at`). Hides the document from listings while preserving records for compliance and audit logs.

#### Request Headers
* `Authorization: Bearer <FIREBASE_ID_TOKEN>`

#### Path Parameters
* `document_id` *(string, UUID)*: The unique ID of the document.

#### Response (`200 OK`)
```json
{
  "message": "Document deleted successfully.",
  "document_id": "e4b2d189-9a74-4b53-a5c9-94038162e84d"
}
```

---

## 4. How to Run & Test Every Single API in Postman (Field-by-Field UI Guide)

### Important First Step (Avoid Cloud Agent Error)
* Look at the **bottom-right corner** of your Postman window.
* Make sure the agent dropdown is changed from **`Cloud Agent`** to **`Desktop Agent`** or **`Auto-select`**.

---

### 1. `GET /health` (Server Liveness Check)
1. **Method Dropdown (top-left):** Select `GET`
2. **URL Bar:** `http://127.0.0.1:8081/health`
3. **Params tab:** Leave empty
4. **Authorization tab:** Select `No Auth`
5. **Body tab:** Select `none`
6. Click **Send** $\rightarrow$ Expected Result (`200 OK`): `{"status": "ok"}`

---

### 2. `POST /api/v1/auth/forgot-password` (Trigger Password Reset)
*(Fixes what was shown in your screenshot!)*

1. **Method Dropdown (top-left):** Select `POST`
2. **URL Bar:** `http://127.0.0.1:8081/api/v1/auth/forgot-password`
3. **Params tab (click this tab):**
   * Under **Key**, type: `email`
   * Under **Value**, type: `testuser@clauseguard.com` *(Fill this in!)*
4. **Authorization tab:** Select `No Auth`
5. **Body tab:** Select `none`
6. Click **Send** $\rightarrow$ Expected Result (`200 OK`):
   ```json
   {
     "message": "If an account with that email exists, a reset link has been sent."
   }
   ```

---

### 3. `POST /api/v1/auth/register` (User Registration)
1. **Method Dropdown (top-left):** Select `POST`
2. **URL Bar:** `http://127.0.0.1:8081/api/v1/auth/register`
3. **Params tab:** Leave empty (do NOT add query parameters here)
4. **Authorization tab:** Select `No Auth`
5. **Body tab (click this tab):**
   * Select radio button **raw**
   * On the far right, change dropdown from *Text* to **JSON**
   * In the main text box, paste:
     ```json
     {
       "firebase_uid": "glJb2C98eBQcMawvNIGU34xk3jn2",
       "email": "testuser@clauseguard.com",
       "display_name": "Test User",
       "role": "tenant",
       "gdpr_consent": true
     }
     ```
6. Click **Send** $\rightarrow$ Expected Result (`201 Created`): User profile object.

---

### 4. `GET /api/v1/account/me` (Get My Profile)
1. **Method Dropdown (top-left):** Select `GET`
2. **URL Bar:** `http://127.0.0.1:8081/api/v1/account/me`
3. **Params tab:** Leave empty
4. **Authorization tab (click this tab):**
   * In the **Type** dropdown, select **Bearer Token**
   * In the **Token** field on the right, paste your Firebase ID Token
5. **Body tab:** Select `none`
6. Click **Send** $\rightarrow$ Expected Result (`200 OK`): User profile object.

---

### 5. `PATCH /api/v1/account/me` (Update Profile)
1. **Method Dropdown (top-left):** Select `PATCH`
2. **URL Bar:** `http://127.0.0.1:8081/api/v1/account/me`
3. **Params tab:** Leave empty
4. **Authorization tab:** Select **Bearer Token** $\rightarrow$ paste token
5. **Body tab (click this tab):**
   * Select **raw** $\rightarrow$ set dropdown to **JSON**
   * In the main text box, paste:
     ```json
     {
       "display_name": "Updated Name",
       "phone_number": "+447999888777"
     }
     ```
6. Click **Send** $\rightarrow$ Expected Result (`200 OK`): Updated user profile object.

---

### 6. `GET /api/v1/account/me/gdpr-export` (GDPR Data Export)
1. **Method Dropdown (top-left):** Select `GET`
2. **URL Bar:** `http://127.0.0.1:8081/api/v1/account/me/gdpr-export`
3. **Params tab:** Leave empty
4. **Authorization tab:** Select **Bearer Token** $\rightarrow$ paste token
5. **Body tab:** Select `none`
6. Click **Send** $\rightarrow$ Expected Result (`200 OK`): Full exported user object & timestamp.

---

### 7. `POST /api/v1/auth/logout` (Logout / Revoke Session)
1. **Method Dropdown (top-left):** Select `POST`
2. **URL Bar:** `http://127.0.0.1:8081/api/v1/auth/logout`
3. **Params tab:** Leave empty
4. **Authorization tab:** Select **Bearer Token** $\rightarrow$ paste token
5. **Body tab:** Select `none`
6. Click **Send** $\rightarrow$ Expected Result (`200 OK`): `{"message": "Session revoked. Please sign in again."}`

---

### 8. `DELETE /api/v1/account/me` (Deactivate Account)
1. **Method Dropdown (top-left):** Select `DELETE`
2. **URL Bar:** `http://127.0.0.1:8081/api/v1/account/me`
3. **Params tab:** Leave empty
4. **Authorization tab:** Select **Bearer Token** $\rightarrow$ paste token
5. **Body tab:** Select `none`
6. Click **Send** $\rightarrow$ Expected Result (`200 OK`): `{"message": "Account deactivated..."}`

---

### 9. `POST /api/v1/documents/upload` (Upload PDF Document)
1. **Method Dropdown (top-left):** Select `POST`
2. **URL Bar:** `http://127.0.0.1:8081/api/v1/documents/upload`
3. **Params tab:** Leave empty
4. **Authorization tab (click this tab):**
   * In the **Type** dropdown, select **Bearer Token**
   * In the **Token** field on the right, paste your Firebase ID Token
5. **Body tab (click this tab):**
   * Select radio button **form-data**
   * Under the **Key** column, type: `file`
   * Hover over the `file` text box $\rightarrow$ click the small dropdown arrow on the right side of the field $\rightarrow$ change from **Text** to **File**
   * Under the **Value** column, click **Select Files** $\rightarrow$ choose any test PDF from your computer (must be $< 20$ MB)
6. Click **Send** $\rightarrow$ Expected Result (`201 Created`):
   ```json
   {
     "message": "Document processed and uploaded successfully.",
     "document": {
       "id": "e4b2d189-9a74-4b53-a5c9-94038162e84d",
       "user_id": "...",
       "original_filename": "your_file.pdf",
       "content_type": "application/pdf",
       "file_size_bytes": 1048576,
       "sha256_hash": "...",
       "s3_key": "documents/your_file_xxxx.txt",
       "s3_uri": "s3://clauseguard-bucket/documents/your_file_xxxx.txt",
       "status": "completed",
       "char_count": 14200,
       "pipeline_error": null,
       "is_deleted": false,
       "created_at": "...",
       "updated_at": "..."
     }
   }
   ```
   *(Copy the returned `"id"` value to test the next endpoints!)*

---

### 10. `GET /api/v1/documents` (List User's Documents)
1. **Method Dropdown (top-left):** Select `GET`
2. **URL Bar:** `http://127.0.0.1:8081/api/v1/documents`
3. **Params tab (click this tab - optional):**
   * Key: `page` $\rightarrow$ Value: `1`
   * Key: `page_size` $\rightarrow$ Value: `20`
4. **Authorization tab:** Select **Bearer Token** $\rightarrow$ paste token
5. **Body tab:** Select `none`
6. Click **Send** $\rightarrow$ Expected Result (`200 OK`): Paginated list containing an array of document objects and `total` count.

---

### 11. `GET /api/v1/documents/{document_id}` (Get Single Document Details)
1. **Method Dropdown (top-left):** Select `GET`
2. **URL Bar:** `http://127.0.0.1:8081/api/v1/documents/<PASTE_DOCUMENT_ID_HERE>`
3. **Params tab:** Leave empty
4. **Authorization tab:** Select **Bearer Token** $\rightarrow$ paste token
5. **Body tab:** Select `none`
6. Click **Send** $\rightarrow$ Expected Result (`200 OK`): Complete document metadata object for that document ID.

---

### 12. `DELETE /api/v1/documents/{document_id}` (Soft-Delete Document)
1. **Method Dropdown (top-left):** Select `DELETE`
2. **URL Bar:** `http://127.0.0.1:8081/api/v1/documents/<PASTE_DOCUMENT_ID_HERE>`
3. **Params tab:** Leave empty
4. **Authorization tab:** Select **Bearer Token** $\rightarrow$ paste token
5. **Body tab:** Select `none`
6. Click **Send** $\rightarrow$ Expected Result (`200 OK`):
   ```json
   {
     "message": "Document deleted successfully.",
     "document_id": "<DELETED_DOCUMENT_ID>"
   }
   ```
   *(Running `GET /api/v1/documents` afterwards will no longer show this document).*

---

## 5. MySQL Verification

To verify that records are being correctly inserted into MySQL during your Postman testing, run this command in your Mac terminal:

```bash
/opt/homebrew/Cellar/mysql/26.7.0_3/bin/mysql -u root -proot -e "USE clauseguard; SELECT id, firebase_uid, email, role FROM users; SELECT id, user_id, original_filename, status, s3_key FROM documents;"
```
