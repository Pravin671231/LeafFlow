# Postman Manual — LeafFlow Admin Auth API

A step-by-step guide to testing all 9 admin auth endpoints using Postman.

---

## Prerequisites

Before opening Postman, make sure:

1. **Backend is running**
   ```
   npm run dev --workspace backend
   ```
   You should see `Server running on port 3000` in the terminal.

2. **Admin account is seeded**
   ```
   npm run seed --workspace backend
   ```
   Your login credentials are whatever you set in `Backend/.env` as `ADMIN_LOGIN_EMAIL` and `ADMIN_PASSWORD`.

3. **SMTP is configured** in `Backend/.env` with real Gmail credentials so OTP emails are delivered.
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-gmail@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx   # Gmail App Password (16 chars)
   MAIL_FROM=your-gmail@gmail.com
   ```

---

## One-Time Postman Setup

Do this once before testing anything.

### 1. Create a Collection

1. Open Postman → click **Collections** in the left sidebar → **+** (New Collection)
2. Name it: `LeafFlow Admin Auth`

### 2. Add Collection Variables

1. Click on the collection name → go to the **Variables** tab
2. Add these three variables:

| Variable | Initial Value | Current Value |
|----------|--------------|---------------|
| `base_url` | `http://localhost:3000` | `http://localhost:3000` |
| `access_token` | *(leave empty)* | *(leave empty)* |
| `otp_session_id` | *(leave empty)* | *(leave empty)* |

3. Click **Save**

> You will paste values into `access_token` and `otp_session_id` as you go through the steps. Using variables means you write `{{access_token}}` in requests instead of pasting long tokens every time.

### 3. Check Default Settings

In Postman → **Settings** (gear icon), confirm:
- **Automatically follow redirects** → ON
- **Send cookies** → ON (this is how the refresh token cookie works)

---

## Flow A — Login (Start Here Every Time)

The login process is always two steps: submit credentials → verify the OTP sent to your email.

---

### Step 1 — Submit Credentials

**Create a new request inside the collection:**

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `{{base_url}}/api/admin/auth/login` |
| Name | `1. Login` |

**Headers tab:**
```
Content-Type: application/json
```

**Body tab → raw → JSON:**
```json
{
  "loginEmail": "admin@leafflow.com",
  "password": "YourPassword1"
}
```
> Replace the values with whatever you set in `ADMIN_LOGIN_EMAIL` and `ADMIN_PASSWORD`.

**Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "message": "OTP sent to your registered email",
  "data": {
    "otpSessionId": "6849f3cfdae5ce6307946abc",
    "expiresInSeconds": 300
  }
}
```

**After success:**
1. Copy the `otpSessionId` value from the response
2. Paste it into the collection variable `otp_session_id` → **Save**
3. Check your email inbox — the OTP (6 digits) will arrive within seconds
4. You have **5 minutes** to use the OTP before it expires

**If you get an error:**

| Code | Status | What went wrong | Fix |
|------|--------|----------------|-----|
| `VALIDATION_ERROR` | 400 | Field name typo — check the `details` object in the response | Fix the field name (e.g. `loginEmail` not `loginEamil`) |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password | Check `.env` values and re-seed |
| `ACCOUNT_LOCKED` | 403 | 5 wrong passwords in a row — locked for 15 minutes | Wait 15 min or re-seed: `npm run seed --workspace backend` |

---

### Step 2 — Verify OTP

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `{{base_url}}/api/admin/auth/login/verify-otp` |
| Name | `2. Verify OTP` |

**Headers tab:**
```
Content-Type: application/json
```

**Body tab → raw → JSON:**
```json
{
  "otpSessionId": "{{otp_session_id}}",
  "otp": "482910"
}
```
> Replace `482910` with the actual 6-digit OTP from your email.

**Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs..."
  }
}
```

**After success:**
1. Copy the `accessToken` value from the response
2. Paste it into the collection variable `access_token` → **Save**
3. Postman automatically saves the `refreshToken` as a cookie — you do not need to do anything with it

**If you get an error:**

| Code | Status | What went wrong | Fix |
|------|--------|----------------|-----|
| `INVALID_OTP` | 401 | Typed wrong OTP or wrong `otpSessionId` | Check the 6-digit OTP in your email carefully |
| `OTP_EXPIRED` | 401 | More than 5 minutes passed | Go back to Step 1 and get a new OTP |
| `OTP_MAX_ATTEMPTS` | 429 | 5 wrong OTP attempts | Go back to Step 1 and get a new OTP |

---

## Flow B — Using Your Session

Once you have an `access_token`, you can call protected endpoints.

> **Access token lasts 15 minutes.** After that, use Step 4 (Refresh) to get a new one without logging in again.

---

### Step 3 — Get My Profile

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `{{base_url}}/api/admin/auth/me` |
| Name | `3. Get My Profile` |

**Authorization tab:**
- Type: `Bearer Token`
- Token: `{{access_token}}`

No body needed. **Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "_id": "6849f3cfdae5ce6307946abc",
    "loginEmail": "admin@leafflow.com",
    "otpDeliveryEmail": "admin@leafflow.com",
    "name": "Admin",
    "role": "admin",
    "isActive": true,
    "failedLoginAttempts": 0,
    "createdAt": "2026-06-10T04:00:00.000Z",
    "updatedAt": "2026-06-10T04:00:00.000Z"
  }
}
```

---

### Step 4 — Refresh Access Token

Use this when the access token expires (after 15 minutes) to get a new one without logging in again.

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `{{base_url}}/api/admin/auth/refresh` |
| Name | `4. Refresh Token` |

No headers, no body — Postman sends the `refreshToken` cookie automatically.

**Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "message": "Access token refreshed",
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs..."
  }
}
```

**After success:** Copy the new `accessToken` and update the collection variable `access_token`.

| Code | Status | What went wrong | Fix |
|------|--------|----------------|-----|
| `INVALID_REFRESH_TOKEN` | 401 | Cookie missing or you already logged out | Go back to Step 1 and log in again |

---

### Step 5 — Logout

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `{{base_url}}/api/admin/auth/logout` |
| Name | `5. Logout` |

**Authorization tab:**
- Type: `Bearer Token`
- Token: `{{access_token}}`

No body needed. **Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

After logout, your `access_token` and the `refreshToken` cookie are both invalid. Clear the `access_token` collection variable and go back to Step 1 to log in again.

---

## Flow C — Forgot Password (Can't Log In)

Use this if you forgot your password and cannot log in.

---

### Step 6 — Request Forgot-Password OTP

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `{{base_url}}/api/admin/auth/forgot-password/send-otp` |
| Name | `6. Forgot Password – Send OTP` |

**Headers tab:**
```
Content-Type: application/json
```

**Body tab → raw → JSON:**
```json
{
  "loginEmail": "admin@leafflow.com"
}
```

**Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "message": "OTP sent to your registered email",
  "data": {
    "otpSessionId": "6849f3cfdae5ce6307946xyz",
    "expiresInSeconds": 300
  }
}
```

> This always returns `200` even if the email doesn't exist in the system — this is intentional to prevent revealing which emails are registered.

**After success:** Copy `otpSessionId` into the collection variable `otp_session_id`.

---

### Step 7 — Reset Password with OTP

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `{{base_url}}/api/admin/auth/forgot-password/reset` |
| Name | `7. Forgot Password – Reset` |

**Headers tab:**
```
Content-Type: application/json
```

**Body tab → raw → JSON:**
```json
{
  "otpSessionId": "{{otp_session_id}}",
  "otp": "193847",
  "newPassword": "NewPassword1"
}
```

> **Password rules:** At least 8 characters, one uppercase letter, one lowercase letter, one number.

**Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

Your password is now updated. Go back to Step 1 and log in with the new password.

---

## Flow D — Reset Password (While Logged In)

Use this when you are already logged in and want to change your password.

---

### Step 8 — Request Reset-Password OTP

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `{{base_url}}/api/admin/auth/reset-password/send-otp` |
| Name | `8. Reset Password – Send OTP` |

**Authorization tab:**
- Type: `Bearer Token`
- Token: `{{access_token}}`

No body needed. **Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "message": "OTP sent to your registered email",
  "data": {
    "otpSessionId": "6849f3cfdae5ce6307946def",
    "expiresInSeconds": 300
  }
}
```

**After success:** Copy `otpSessionId` into the collection variable `otp_session_id`.

---

### Step 9 — Confirm New Password

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `{{base_url}}/api/admin/auth/reset-password/confirm` |
| Name | `9. Reset Password – Confirm` |

**Authorization tab:**
- Type: `Bearer Token`
- Token: `{{access_token}}`

**Headers tab:**
```
Content-Type: application/json
```

**Body tab → raw → JSON:**
```json
{
  "otpSessionId": "{{otp_session_id}}",
  "otp": "736291",
  "newPassword": "NewPassword1"
}
```

> **Password rules:** At least 8 characters, one uppercase letter, one lowercase letter, one number.

**Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

## Error Code Reference

| Code | Status | Plain-English Meaning | What to Do |
|------|--------|-----------------------|-----------|
| `VALIDATION_ERROR` | 400 | A required field is missing or has the wrong format | Check the `details` object in the response — it shows exactly which field failed and why |
| `UNAUTHORIZED` | 401 | No Bearer token in the Authorization header | Add `Authorization: Bearer {{access_token}}` |
| `INVALID_TOKEN` | 401 | Bearer token is malformed or tampered | Copy the token again carefully — no extra spaces |
| `TOKEN_EXPIRED` | 401 | Access token is older than 15 minutes | Use Step 4 (Refresh) to get a new one |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password | Check `.env` credentials and re-seed |
| `INVALID_OTP` | 401 | Wrong 6-digit OTP or wrong `otpSessionId` | Read OTP from email carefully |
| `OTP_EXPIRED` | 401 | OTP session is older than 5 minutes | Re-trigger the send-otp step |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh cookie is missing or revoked | Log in again from Step 1 |
| `ACCOUNT_LOCKED` | 403 | 5 consecutive failed login attempts | Wait 15 minutes or re-seed the admin |
| `NOT_FOUND` | 404 | Resource not found | Check the URL path |
| `OTP_MAX_ATTEMPTS` | 429 | 5 wrong OTP attempts on the same session | Re-trigger the send-otp step |

---

## Understanding Validation Errors

When you send a request with a missing or wrong field, the response includes a `details` object that tells you exactly what is wrong:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "loginEmail": "Invalid email",
    "password": "Required"
  }
}
```

Each key in `details` is the field name, and the value is the reason it failed. Fix those fields in your request body and try again.
