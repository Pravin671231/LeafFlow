# Postman Manual — LeafFlow Buyer Auth API

A step-by-step guide to testing all 8 buyer auth endpoints using Postman.

---

## Prerequisites

Before opening Postman, make sure:

1. **Backend is running**
   ```
   npm run dev --workspace backend
   ```
   You should see `Server running on port 3000` in the terminal.

2. **SMTP is configured** in `Backend/.env.dev` with real Gmail credentials so OTP emails are delivered.
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-gmail@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx   # Gmail App Password (16 chars)
   MAIL_FROM=your-gmail@gmail.com
   ```

3. **Google OAuth is configured** (only needed for Flows B and C).
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/buyer/auth/google/callback
   ```

---

## One-Time Postman Setup

Do this once before testing anything.

### 1. Create a Collection

1. Open Postman → click **Collections** in the left sidebar → **+** (New Collection)
2. Name it: `LeafFlow Buyer Auth`

### 2. Add Collection Variables

1. Click on the collection name → go to the **Variables** tab
2. Add these variables:

| Variable | Initial Value | Current Value |
|----------|--------------|---------------|
| `base_url` | `http://localhost:3000` | `http://localhost:3000` |
| `access_token` | *(leave empty)* | *(leave empty)* |
| `otp_session_id` | *(leave empty)* | *(leave empty)* |

3. Click **Save**

> You will paste values into `access_token` and `otp_session_id` as you go through the steps.

### 3. Check Default Settings

In Postman → **Settings** (gear icon), confirm:
- **Automatically follow redirects** → ON
- **Send cookies** → ON (this is how the refresh token cookie works)

---

## Flow A — Email OTP Login

The email login process is always two steps: request an OTP → verify it.

---

### Step 1 — Send OTP

**Create a new request inside the collection:**

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `{{base_url}}/api/buyer/auth/email/send-otp` |
| Name | `1. Send OTP` |

**Headers tab:**
```
Content-Type: application/json
```

**Body tab → raw → JSON:**
```json
{
  "email": "buyer@example.com"
}
```
> Use any email address you have access to. If no buyer account exists for this email, one is created automatically.

**Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "message": "OTP sent to your email",
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
| `VALIDATION_ERROR` | 400 | `email` field missing or not a valid email address | Check the request body — field must be `email`, not `loginEmail` |

---

### Step 2 — Verify OTP

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `{{base_url}}/api/buyer/auth/email/verify-otp` |
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
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
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
| `INVALID_OTP` | 401 | Typed the wrong OTP or wrong `otpSessionId` | Check the 6-digit OTP in your email carefully |
| `OTP_EXPIRED` | 401 | More than 5 minutes passed | Go back to Step 1 and get a new OTP |
| `OTP_MAX_ATTEMPTS` | 429 | 5 wrong OTP attempts on the same session | Go back to Step 1 and get a new OTP |
| `VALIDATION_ERROR` | 400 | `otpSessionId` or `otp` field is missing | Check both fields are present in the body |

---

## Flow B — Google OAuth Login

Use this flow to log in with a Google account via browser redirect.

> **Note:** The Google OAuth redirect opens a browser tab. Postman cannot complete the browser interaction directly. Use a browser to initiate the redirect and then switch to Postman to call the callback manually if testing, or test this flow end-to-end through the buyer-app frontend.

---

### Step 3 — Initiate Google Redirect

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `{{base_url}}/api/buyer/auth/google` |
| Name | `3. Google Redirect` |

No headers, no body. **Click Send.**

With **Automatically follow redirects** ON, Postman will follow the 302 to Google's consent page and you will see the Google sign-in UI in the response preview. The actual redirect URL looks like:
```
https://accounts.google.com/o/oauth2/auth?client_id=...&redirect_uri=...&scope=email%20profile&response_type=code&access_type=offline
```

> If you see `503 GOOGLE_OAUTH_UNAVAILABLE`, the Google env vars are not set in `Backend/.env.dev`. See Prerequisites above.

---

### Step 4 — Handle Google Callback

After the user approves in the Google consent screen, Google redirects to:
```
GET /api/buyer/auth/google/callback?code=<authorization-code>
```
The backend exchanges the code for an ID token, finds or creates the buyer account, and responds with tokens.

**For manual testing in Postman:**

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `{{base_url}}/api/buyer/auth/google/callback?code=PASTE_CODE_HERE` |
| Name | `4. Google Callback` |

Replace `PASTE_CODE_HERE` with the `code` query parameter value from the redirect URL in your browser address bar.

**Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "message": "Google login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

The `refreshToken` cookie is set automatically. Copy `accessToken` into the `access_token` collection variable.

**If you get an error:**

| Code | Status | What went wrong | Fix |
|------|--------|----------------|-----|
| `MISSING_CODE` | 400 | `code` query parameter is absent | Make sure to include `?code=...` in the URL |
| `INVALID_TOKEN` | 401 | Google rejected the authorization code (e.g. already used or expired) | Complete the Google consent flow again to get a fresh code |
| `GOOGLE_OAUTH_UNAVAILABLE` | 503 | Google env vars missing in `Backend/.env.dev` | Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |

---

## Flow C — Google One Tap Login

Use this flow for One Tap sign-in where the frontend receives a `credential` JWT directly from the Google One Tap widget.

---

### Step 5 — One Tap Verify

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `{{base_url}}/api/buyer/auth/google/one-tap` |
| Name | `5. Google One Tap` |

**Headers tab:**
```
Content-Type: application/json
```

**Body tab → raw → JSON:**
```json
{
  "credential": "eyJhbGciOiJSUzI1NiIs..."
}
```
> The `credential` value is the ID token string returned by the Google One Tap widget on the frontend. For backend-only testing, obtain a token from the [Google OAuth Playground](https://developers.google.com/oauthplayground).

**Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "message": "Google One Tap login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

Copy `accessToken` into the `access_token` collection variable. The `refreshToken` cookie is set automatically.

**If you get an error:**

| Code | Status | What went wrong | Fix |
|------|--------|----------------|-----|
| `VALIDATION_ERROR` | 400 | `credential` field is missing or empty | Ensure the body includes `"credential": "..."` |
| `INVALID_TOKEN` | 401 | Google credential JWT is invalid or expired | Get a fresh credential from the One Tap widget or OAuth Playground |
| `GOOGLE_OAUTH_UNAVAILABLE` | 503 | `GOOGLE_CLIENT_ID` not set in `Backend/.env.dev` | Add the env var and restart the server |

---

## Flow D — Using Your Session

Once you have an `access_token` (from any login flow), you can call protected endpoints.

> **Access token lasts 15 minutes.** After that, use Step 6 (Refresh) to get a new one without logging in again.

---

### Step 6 — Refresh Access Token

Use this when the access token expires to get a new one without going through login again.

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `{{base_url}}/api/buyer/auth/refresh` |
| Name | `6. Refresh Token` |

No headers, no body — Postman sends the `refreshToken` cookie automatically.

**Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "message": "Access token refreshed",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**After success:** Copy the new `accessToken` and update the collection variable `access_token`.

| Code | Status | What went wrong | Fix |
|------|--------|----------------|-----|
| `INVALID_REFRESH_TOKEN` | 401 | Cookie is missing or you already logged out | Go back to Flow A/B/C and log in again |

---

### Step 7 — Get My Profile

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `{{base_url}}/api/buyer/auth/me` |
| Name | `7. Get My Profile` |

**Authorization tab:**
- Type: `Bearer Token`
- Token: `{{access_token}}`

No body needed. **Click Send. Expected response — `200 OK`:**
```json
{
  "success": true,
  "message": "Profile fetched successfully",
  "data": {
    "_id": "6849f3cfdae5ce6307946abc",
    "email": "buyer@example.com",
    "googleId": null,
    "name": null,
    "phone": null,
    "addresses": [],
    "role": "buyer",
    "isVerified": true,
    "createdAt": "2026-06-17T04:00:00.000Z",
    "updatedAt": "2026-06-17T04:00:00.000Z"
  }
}
```

> `name`, `googleId`, and `phone` will be `null` for OTP-only signups until the buyer completes their profile. `googleId` will be populated for Google-authenticated accounts.

**If you get an error:**

| Code | Status | What went wrong | Fix |
|------|--------|----------------|-----|
| `UNAUTHORIZED` | 401 | No Bearer token in the Authorization header | Add the token to the Authorization tab |
| `TOKEN_EXPIRED` | 401 | Access token is older than 15 minutes | Use Step 6 (Refresh) to get a new one |
| `FORBIDDEN` | 403 | You are using an **admin** JWT on a buyer route | Log in via a buyer flow (A, B, or C) to get a buyer token |

---

### Step 8 — Logout

**Create a new request:**

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `{{base_url}}/api/buyer/auth/logout` |
| Name | `8. Logout` |

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

After logout, your `access_token` and the `refreshToken` cookie are both invalid. Clear the `access_token` collection variable and go back to Flow A, B, or C to log in again.

---

## Account Linking Behaviour

The buyer auth system links accounts automatically across login methods:

| Scenario | What happens |
|----------|-------------|
| New email → OTP login | A new buyer account is created with `isVerified: false`; flips to `true` on OTP verification |
| New Google account (no matching email) | A new buyer account is created with `isVerified: true` and `googleId` set |
| Google login where email matches an existing OTP-only account | The existing account is updated: `googleId` is added, `isVerified` set to `true`; no duplicate created |
| Returning Google user | Looked up by `googleId` — no changes to the account |

---

## Error Code Reference

| Code | Status | Plain-English Meaning | What to Do |
|------|--------|-----------------------|-----------|
| `VALIDATION_ERROR` | 400 | A required field is missing or has the wrong format | Check the `details` object in the response — it shows exactly which field failed and why |
| `MISSING_CODE` | 400 | `code` query param absent from `/google/callback` | Include `?code=...` in the URL |
| `UNAUTHORIZED` | 401 | No Bearer token in the Authorization header | Add `Authorization: Bearer {{access_token}}` |
| `INVALID_TOKEN` | 401 | Bearer token is malformed, or Google credential is invalid | Re-copy the token carefully; for Google tokens, get a fresh credential |
| `TOKEN_EXPIRED` | 401 | Access token is older than 15 minutes | Use Step 6 (Refresh) to get a new one |
| `INVALID_OTP` | 401 | Wrong 6-digit OTP or wrong `otpSessionId` | Read OTP from email carefully |
| `OTP_EXPIRED` | 401 | OTP session is older than 5 minutes | Re-trigger the send-otp step |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh cookie is missing or revoked | Log in again from Flow A, B, or C |
| `FORBIDDEN` | 403 | Admin JWT used on a buyer route | Obtain a buyer token by logging in through a buyer flow |
| `NOT_FOUND` | 404 | Buyer account not found (e.g. deleted mid-session) | Log in again |
| `OTP_MAX_ATTEMPTS` | 429 | 5 wrong OTP attempts on the same session | Re-trigger the send-otp step |
| `GOOGLE_OAUTH_UNAVAILABLE` | 503 | Google env vars not configured on the server | Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` in `.env.dev` |

---

## Understanding Validation Errors

When you send a request with a missing or wrong field, the response includes a `details` object:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "email": "Invalid email"
  }
}
```

Each key in `details` is the field name, and the value is the reason it failed. Fix those fields in your request body and try again.
