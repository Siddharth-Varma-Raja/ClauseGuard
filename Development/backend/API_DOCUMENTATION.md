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

## 5. MySQL Verification

To verify that records are being correctly inserted into MySQL during your Postman testing, run this command in your Mac terminal:

```bash
/opt/homebrew/Cellar/mysql/26.7.0_3/bin/mysql -u root -proot -e "USE clauseguard; SELECT id, firebase_uid, email, role, is_active FROM users; SELECT * FROM audit_logs;"
```
