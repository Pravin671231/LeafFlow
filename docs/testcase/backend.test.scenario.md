# Backend Test Scenarios — Admin Auth (Issue #35)

## Feature: Admin Authentication

SRS refs: §5.1 (ADM-001–004), §11.2, §12 (SEC-01–12), §15.1
Coverage target: ≥ 90% (§8.5)

---

## Unit Tests

| ID | Description | Input | Expected |
|----|-------------|-------|----------|
| U1 | `generateOtp()` returns 6-digit string | — | matches `/^\d{6}$/` |
| U2 | `hashOtp()` returns bcrypt hash, not plain text | `"123456"` | hash ≠ input; `bcrypt.compare` → true |
| U3 | `verifyOtp()` returns true for correct OTP | correct otp + hash | `true` |
| U4 | `verifyOtp()` returns false for wrong OTP | wrong otp + hash | `false` |
| U5 | `signAccessToken()` returns RS256 JWT | admin payload | JWT with `alg: RS256` |
| U6 | `verifyAccessToken()` returns payload for valid token | valid JWT | `{ adminId, role }` |
| U7 | `verifyAccessToken()` throws for expired token | expired JWT | throws |
| U8 | `verifyAccessToken()` throws for tampered token | bad JWT | throws |
| U9 | `asyncHandler` calls next(err) when async fn throws | fn that throws | `next` called with error |

---

## API Integration Tests (Given / When / Then)

**I1 — Login: correct credentials**
- Given: valid admin document in DB
- When: POST `/api/admin/auth/login` with correct loginEmail + password
- Then: `200`, body contains `otpSessionId` and `expiresInSeconds: 300`

**I2 — Login: wrong password**
- Given: valid admin in DB
- When: POST `/api/admin/auth/login` with wrong password
- Then: `401 { success: false, code: "INVALID_CREDENTIALS" }`

**I3 — Login: account locked**
- Given: admin with `failedLoginAttempts >= 5` and `lockUntil` in the future
- When: POST `/api/admin/auth/login`
- Then: `403 { success: false, code: "ACCOUNT_LOCKED" }`

**I4 — Login: 5th failure triggers lockout**
- Given: admin with `failedLoginAttempts: 4`
- When: POST login with wrong password
- Then: `401`, `lockUntil` is set in DB

**I5 — Verify OTP: correct**
- Given: valid non-expired OtpSession in DB
- When: POST `/api/admin/auth/login/verify-otp` with correct OTP
- Then: `200`, `accessToken` in body, `refreshToken` httpOnly cookie set

**I6 — Verify OTP: wrong OTP**
- Given: valid OtpSession
- When: POST `verify-otp` with wrong OTP
- Then: `401 { success: false, code: "INVALID_OTP" }`

**I7 — Verify OTP: expired session**
- Given: OtpSession with `expiresAt` in the past
- When: POST `verify-otp`
- Then: `401 { success: false, code: "OTP_EXPIRED" }`

**I8 — Verify OTP: max attempts exceeded**
- Given: OtpSession with `attemptCount >= 5`
- When: POST `verify-otp`
- Then: `429 { success: false, code: "OTP_MAX_ATTEMPTS" }`

**I9 — GET /me: valid JWT**
- Given: valid RS256 access token
- When: GET `/api/admin/auth/me` with Bearer token
- Then: `200`, body contains admin profile fields

**I10 — GET /me: expired JWT**
- Given: expired access token
- When: GET `/api/admin/auth/me`
- Then: `401 { success: false, code: "TOKEN_EXPIRED" }`

**I11 — Refresh: valid cookie**
- Given: valid non-revoked refresh token in httpOnly cookie
- When: POST `/api/admin/auth/refresh`
- Then: `200`, new `accessToken` in body

**I12 — Refresh: after logout (revoked token)**
- Given: revoked refresh token
- When: POST `/api/admin/auth/refresh`
- Then: `401 { success: false, code: "INVALID_REFRESH_TOKEN" }`

**I13 — Logout**
- Given: valid refresh token cookie
- When: POST `/api/admin/auth/logout`
- Then: `200`, token marked revoked in DB

**I14 — Forgot password: unknown email (no enumeration)**
- Given: email not in DB
- When: POST `/api/admin/auth/forgot-password/send-otp`
- Then: `200` (generic success — no leak of email existence)

**I15 — Forgot password: reset with valid OTP**
- Given: valid OtpSession with `purpose: admin_forgot`
- When: POST `/api/admin/auth/forgot-password/reset` with OTP + newPassword
- Then: `200`, admin's passwordHash updated in DB

**I16 — Reset password (authenticated): send OTP**
- Given: valid access token
- When: POST `/api/admin/auth/reset-password/send-otp`
- Then: `200`, OtpSession created with `purpose: admin_reset`

**I17 — Reset password (authenticated): confirm**
- Given: valid access token + OtpSession with `purpose: admin_reset`
- When: POST `/api/admin/auth/reset-password/confirm` with OTP + newPassword
- Then: `200`, passwordHash updated

**I18 — No plain OTP stored in DB**
- Given: login flow triggered
- When: OtpSession document read from DB
- Then: `otpHash` field does not equal the plain OTP that was sent

---

## Middleware Tests (Given / When / Then)

**M1 — Valid JWT passes through**
- Given: `adminAuth` middleware on a test route
- When: request has `Authorization: Bearer <valid-token>`
- Then: `req.admin` is populated, `next()` called, route returns `200`

**M2 — Missing Authorization header**
- Given: no Authorization header
- When: request hits `adminAuth` middleware
- Then: `401 { success: false, code: "UNAUTHORIZED" }`

**M3 — Expired JWT**
- Given: expired RS256 token
- When: request hits `adminAuth`
- Then: `401 { success: false, code: "TOKEN_EXPIRED" }`

**M4 — Tampered / invalid JWT**
- Given: malformed or tampered token string
- When: request hits `adminAuth`
- Then: `401 { success: false, code: "INVALID_TOKEN" }`

---

## Feature: Buyer Authentication — User Model (Issue #37)

SRS refs: §4.1 (BUY-001–006), §10.4, §11.3, §15.2
Coverage target: ≥ 80% lines/functions, ≥ 75% branches (project threshold)

---

## Model Unit Tests

All tests use `new User({...}).validateSync()` — synchronous, no DB.
**Test file:** `Backend/__tests__/models/user.test.ts`
**Model file (to be created):** `Backend/src/models/User.ts`

| ID  | Description                                       | Input                                                           | Expected                                                     |
|-----|---------------------------------------------------|-----------------------------------------------------------------|--------------------------------------------------------------|
| U1  | Rejects doc missing required fields               | `{}`                                                            | `err.errors["email"]` and `err.errors["name"]` defined       |
| U2  | Accepts doc without googleId and phone            | `{ email, name }`                                               | `validateSync()` → `undefined`                               |
| U3  | Defaults `isVerified` to `false`                  | `{ email, name }`                                               | `doc.isVerified === false`                                   |
| U4  | Defaults `role` to `"buyer"`                      | `{ email, name }`                                               | `doc.role === "buyer"`                                       |
| U5  | Defaults `addresses` to empty array               | `{ email, name }`                                               | `doc.addresses` is `[]`                                      |
| U6  | Lowercases the email                              | `email: "Test@Example.COM"`                                     | `doc.email === "test@example.com"`                           |
| U7  | Rejects address entry missing required sub-fields | `addresses: [{}]`                                               | errors on `addresses.0.line1`, `.city`, `.state`, `.pincode` |
| U8  | Accepts a valid address entry                     | `addresses: [{ line1, city, state, pincode, isDefault: true }]` | `validateSync()` → `undefined`                               |
| U9  | Defaults address `isDefault` to `false`           | `addresses: [{ line1, city, state, pincode }]`                  | `doc.addresses[0].isDefault === false`                       |

---

## Feature: Buyer Authentication — Service & Middleware (Issue #17)

SRS refs: §4.1 (BUY-001–006), §11.3, §12 (SEC-01–12), §15.2
Coverage target: ≥ 80% services, ≥ 90% auth middleware

**Test helper:** `Backend/__tests__/helpers/seedBuyer.ts` — exports `seedBuyer(overrides?)`, `clearBuyerCollections()`

---

## Unit Tests — Buyer Token (`services/token.ts` additions)

**Test file:** `Backend/__tests__/services/buyerToken.unit.test.ts`

| ID | Description | Input | Expected |
|----|-------------|-------|----------|
| U1 | `signBuyerAccessToken()` returns RS256 JWT | `{ userId, role: "buyer" }` | JWT with `alg: RS256` in header |
| U2 | `verifyBuyerAccessToken()` returns payload for valid token | valid buyer JWT | `{ userId, role: "buyer" }` |
| U3 | `verifyBuyerAccessToken()` throws for tampered token | last 5 chars replaced | throws |
| U4 | `verifyBuyerAccessToken()` throws for junk string | `"bad.token.here"` | throws |
| U5 | `createBuyerRefreshToken()` writes doc with `role: "buyer"` and correct `userId` | valid `userId` ObjectId | `RefreshToken` in DB has `role: "buyer"`, `userId` matches |
| U6 | `validateBuyerRefreshToken()` returns `userId` + `tokenHash` for valid token | raw token from U5 | `{ userId, tokenHash }` |
| U7 | `validateBuyerRefreshToken()` throws for revoked token | token with `revokedAt` set | throws |
| U8 | `validateBuyerRefreshToken()` throws for expired token | token with `expiresAt` in past | throws |
| U9 | `validateBuyerRefreshToken()` throws for admin-role token | admin refresh token raw | throws (wrong `role` filter) |

---

## Unit Tests — Buyer Auth Service (`services/buyerAuth.service.ts`)

**Test file:** `Backend/__tests__/services/buyerAuth.service.unit.test.ts`
Mocks: `vi.mock("../models/User")`, `vi.mock("../models/OtpSession")`, `vi.mock("../services/email")`, `vi.mock("google-auth-library")`

### `sendOtp`

| ID | Description | Input | Expected |
|----|-------------|-------|----------|
| U10 | New email → creates User, creates OtpSession, calls sendOtpEmail, returns otpSessionId | new email | `{ otpSessionId, expiresInSeconds: 300 }` |
| U11 | Existing user email → no new User created | email of existing user | `User.create` not called; `otpSessionId` returned |
| U12 | `sendOtpEmail` throws → error swallowed, still returns otpSessionId | email where sendMail fails | `{ otpSessionId }` returned, no throw |

### `verifyOtpAndIssueTokens`

| ID | Description | Input | Expected |
|----|-------------|-------|----------|
| U13 | Correct OTP + valid session → sets `isVerified: true`, returns tokens | correct otp + valid session | `{ accessToken, rawRefresh }` |
| U14 | Already-verified user → no error, tokens issued normally | verified user | `{ accessToken, rawRefresh }` |
| U15 | Wrong OTP → increments `attemptCount`, throws `INVALID_OTP` | wrong otp | `401 INVALID_OTP`; `attemptCount` incremented |
| U16 | Expired session (`expiresAt` in past) → throws `OTP_EXPIRED` | expired session | `401 OTP_EXPIRED` |
| U17 | `attemptCount >= 5` → throws `OTP_MAX_ATTEMPTS` | session with `attemptCount: 5` | `429 OTP_MAX_ATTEMPTS` |
| U18 | Non-existent `otpSessionId` → throws `INVALID_OTP` | random ObjectId | `401 INVALID_OTP` |
| U19 | Session has wrong purpose (e.g. `admin_login`) → throws `INVALID_OTP` | session with `purpose: admin_login` | `401 INVALID_OTP` |

### `handleGoogleOneTap`

| ID | Description | Input | Expected |
|----|-------------|-------|----------|
| U20 | Valid credential, brand-new email → creates User with `isVerified: true`, returns tokens | mocked `verifyIdToken` → new email | `User.create` called; `{ accessToken, rawRefresh }` |
| U21 | Valid credential, email matches existing user without `googleId` → merges `googleId` (account linking) | mocked payload email = existing user's email | existing doc updated; `googleId` set |
| U22 | Valid credential, `googleId` already on existing user → no duplicate User created | mocked `sub` matches existing `googleId` | `User.create` not called |
| U23 | `verifyIdToken` throws → throws `INVALID_TOKEN` | mocked to throw | `401 INVALID_TOKEN` |
| U24 | Google payload has no `email` → throws `INVALID_TOKEN` | mocked payload with `email: undefined` | `401 INVALID_TOKEN` |

### `handleGoogleCallback`

| ID | Description | Input | Expected |
|----|-------------|-------|----------|
| U25 | Valid code → `getToken` succeeds, user created, returns tokens | mocked `getToken` success | `{ accessToken, rawRefresh }` |
| U26 | Valid code, email matches existing user without `googleId` → merges `googleId` | mocked payload email = existing user | `googleId` merged |
| U27 | `getToken` rejects → error propagates | mocked `getToken` to throw | throws |
| U28 | `id_token` missing from Google response → throws `INVALID_TOKEN` | mocked `tokens: {}` (no `id_token`) | `401 INVALID_TOKEN` |

### `refreshBuyerAccessToken`

| ID | Description | Input | Expected |
|----|-------------|-------|----------|
| U29 | Valid raw token → returns new `accessToken` with `role: "buyer"` | valid raw refresh token | `{ accessToken }` |
| U30 | Invalid or revoked token → throws `INVALID_REFRESH_TOKEN` | bad raw token | `401 INVALID_REFRESH_TOKEN` |

### `logoutBuyer`

| ID | Description | Input | Expected |
|----|-------------|-------|----------|
| U31 | Valid raw token → `RefreshToken` doc gets `revokedAt` set | valid raw | `revokedAt` defined in DB |
| U32 | `raw` is `undefined` → no-op, no throw | `undefined` | resolves without throwing |
| U33 | Invalid token (`validateBuyerRefreshToken` throws) → swallowed, no throw | bad raw | resolves without throwing |

### `getBuyerProfile`

| ID | Description | Input | Expected |
|----|-------------|-------|----------|
| U34 | Valid `userId` → returns User document | existing userId | user doc returned |
| U35 | Non-existent `userId` → throws `NOT_FOUND` | unknown ObjectId | `404 NOT_FOUND` |

---

## API Integration Tests (Given / When / Then)

`nodemailer` mocked at the top of all test files that trigger OTP email. `google-auth-library` mocked in Google endpoint tests.

**Helper mock — `google-auth-library`:**
```ts
vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: vi.fn().mockResolvedValue({
      getPayload: () => ({ sub: "g-123", email: "buyer@test.com", name: "Test Buyer" }),
    }),
    generateAuthUrl: vi.fn().mockReturnValue("https://accounts.google.com/auth?mock"),
    getToken: vi.fn().mockResolvedValue({ tokens: { id_token: "mock-id-token" } }),
    setCredentials: vi.fn(),
  })),
}));
```

### `POST /api/buyer/auth/email/send-otp`

**Test file:** `Backend/__tests__/buyer-auth/send-otp.api.test.ts`

**I1 — Valid email: OTP session created**
- Given: no prior User in DB
- When: POST `/api/buyer/auth/email/send-otp` with `{ email: "buyer@test.com" }`
- Then: `200`, body contains `otpSessionId` and `expiresInSeconds: 300`

**I2 — New email: User created in DB**
- Given: no prior User in DB
- When: POST `send-otp`
- Then: `200`, `User.findOne({ email })` returns doc with `isVerified: false`

**I3 — Existing user: no duplicate User created**
- Given: User already exists for that email
- When: POST `send-otp` a second time
- Then: `200`, still only one User doc in DB

**I4 — Missing email field**
- Given: empty body
- When: POST `send-otp`
- Then: `400 { success: false, code: "VALIDATION_ERROR" }`

**I5 — Invalid email format**
- Given: `{ email: "notanemail" }`
- When: POST `send-otp`
- Then: `400 { success: false, code: "VALIDATION_ERROR" }`

**I6 — Email delivery fails: non-fatal**
- Given: `sendMail` mock throws
- When: POST `send-otp`
- Then: `200`, `otpSessionId` still returned

### `POST /api/buyer/auth/email/verify-otp`

**Test file:** `Backend/__tests__/buyer-auth/verify-otp.api.test.ts`

**I7 — Correct OTP: tokens issued**
- Given: User in DB, valid non-expired OtpSession with `purpose: buyer_login`
- When: POST `/api/buyer/auth/email/verify-otp` with correct `otpSessionId` + `otp`
- Then: `200`, `accessToken` in body, `refreshToken` httpOnly cookie set

**I8 — Wrong OTP: attemptCount incremented**
- Given: valid OtpSession
- When: POST `verify-otp` with wrong otp
- Then: `401 { code: "INVALID_OTP" }`, `OtpSession.attemptCount` incremented by 1 in DB

**I9 — Expired session**
- Given: OtpSession with `expiresAt` in the past
- When: POST `verify-otp`
- Then: `401 { code: "OTP_EXPIRED" }`

**I10 — Max attempts exceeded**
- Given: OtpSession with `attemptCount: 5`
- When: POST `verify-otp`
- Then: `429 { code: "OTP_MAX_ATTEMPTS" }`

**I11 — Non-existent session**
- Given: random `otpSessionId` not in DB
- When: POST `verify-otp`
- Then: `401 { code: "INVALID_OTP" }`

**I12 — Missing otpSessionId field**
- Given: body `{ otp: "123456" }` only
- When: POST `verify-otp`
- Then: `400 { code: "VALIDATION_ERROR" }`

**I13 — OTP length ≠ 6**
- Given: `{ otpSessionId: "...", otp: "123" }`
- When: POST `verify-otp`
- Then: `400 { code: "VALIDATION_ERROR" }`

**I14 — Correct OTP: isVerified set to true**
- Given: User with `isVerified: false`, valid OtpSession
- When: POST `verify-otp` with correct otp
- Then: `200`, `User.findById` shows `isVerified: true` in DB

### Google Auth Endpoints

**Test file:** `Backend/__tests__/buyer-auth/google.api.test.ts`

**I15 — One Tap: new user created**
- Given: no User in DB, `verifyIdToken` mock returns valid payload
- When: POST `/api/buyer/auth/google/one-tap` with `{ credential: "mock" }`
- Then: `200`, `accessToken` in body, `refreshToken` cookie set, User doc in DB with `isVerified: true`

**I16 — One Tap: account linking (email match)**
- Given: User exists with same email but no `googleId`
- When: POST `google/one-tap`
- Then: `200`, existing User doc updated with `googleId` — no new User created

**I17 — One Tap: returning Google user**
- Given: User exists with matching `googleId`
- When: POST `google/one-tap`
- Then: `200`, no duplicate User created

**I18 — One Tap: invalid credential**
- Given: `verifyIdToken` mock throws
- When: POST `google/one-tap` with bad credential
- Then: `401 { code: "INVALID_TOKEN" }`

**I19 — One Tap: missing credential field**
- Given: empty body
- When: POST `google/one-tap`
- Then: `400 { code: "VALIDATION_ERROR" }`

**I20 — Google redirect**
- Given: no auth required
- When: GET `/api/buyer/auth/google`
- Then: `302` redirect to `accounts.google.com` OAuth URL

**I21 — Google callback: valid code**
- Given: `getToken` mock returns `id_token`, user created/found
- When: GET `/api/buyer/auth/google/callback?code=valid`
- Then: `200`, `accessToken` in body, `refreshToken` cookie set

**I22 — Google callback: missing code**
- Given: no `code` query param
- When: GET `/api/buyer/auth/google/callback`
- Then: `400 { code: "VALIDATION_ERROR" }`

**I23 — Google callback: invalid code**
- Given: `getToken` mock throws
- When: GET `/api/buyer/auth/google/callback?code=bad`
- Then: `401 { code: "INVALID_TOKEN" }`

### Session Endpoints (refresh / logout / me)

**Test file:** `Backend/__tests__/buyer-auth/session.api.test.ts`

**I24 — Refresh: valid cookie**
- Given: valid non-revoked buyer `RefreshToken` in httpOnly cookie
- When: POST `/api/buyer/auth/refresh`
- Then: `200`, new `accessToken` in body

**I25 — Refresh: no cookie**
- Given: no `refreshToken` cookie
- When: POST `/api/buyer/auth/refresh`
- Then: `401`

**I26 — Refresh: revoked token**
- Given: `RefreshToken` doc has `revokedAt` set
- When: POST `/api/buyer/auth/refresh`
- Then: `401 { code: "INVALID_REFRESH_TOKEN" }`

**I27 — Logout: valid session**
- Given: valid buyer Bearer token + `refreshToken` cookie
- When: POST `/api/buyer/auth/logout`
- Then: `200`, `refreshToken` cookie cleared, token marked revoked in DB

**I28 — Logout: no auth header**
- Given: no `Authorization` header
- When: POST `/api/buyer/auth/logout`
- Then: `401 { code: "UNAUTHORIZED" }`

**I29 — Logout: already-revoked token**
- Given: valid Bearer token but `refreshToken` cookie already revoked
- When: POST `/api/buyer/auth/logout`
- Then: `200` (graceful no-op)

**I30 — GET /me: valid buyer token**
- Given: valid buyer access token, User in DB
- When: GET `/api/buyer/auth/me`
- Then: `200`, body contains user profile fields (`email`, `name`, `role`)

**I31 — GET /me: no auth header**
- Given: no `Authorization` header
- When: GET `/api/buyer/auth/me`
- Then: `401 { code: "UNAUTHORIZED" }`

**I32 — GET /me: admin token rejected**
- Given: valid admin access token (`role: "admin"`)
- When: GET `/api/buyer/auth/me`
- Then: `401` (buyerAuth middleware rejects wrong role)

---

## Middleware Tests (Given / When / Then)

**Test file:** `Backend/__tests__/middleware/buyerAuth.middleware.test.ts`
Setup: minimal Express app — `GET /protected` behind `buyerAuth`; `GET /optional` behind `optionalBuyerAuth`.

### `buyerAuth` (hard guard)

**M1 — Valid buyer token passes through**
- Given: `buyerAuth` on a test route
- When: `Authorization: Bearer <valid-buyer-token>`
- Then: `req.buyer` populated with `{ userId, role: "buyer" }`, route returns `200`

**M2 — Missing Authorization header**
- Given: no header
- When: request hits `buyerAuth`
- Then: `401 { code: "UNAUTHORIZED" }`

**M3 — Malformed token string**
- Given: `Authorization: Bearer bad.token.here`
- When: request hits `buyerAuth`
- Then: `401 { code: "TOKEN_EXPIRED" }`

**M4 — Tampered token**
- Given: valid buyer token with last 5 chars replaced
- When: request hits `buyerAuth`
- Then: `401 { code: "INVALID_TOKEN" }`

**M5 — Admin token rejected by buyer guard**
- Given: valid admin access token (`role: "admin"`)
- When: request hits `buyerAuth`
- Then: `401` (role mismatch)

### `optionalBuyerAuth` (soft guard)

**M6 — Valid buyer token: req.buyer populated**
- Given: valid buyer Bearer token
- When: request hits `optionalBuyerAuth`
- Then: `req.buyer` populated, `next()` called, route returns `200`

**M7 — No Authorization header: continues as anonymous**
- Given: no header
- When: request hits `optionalBuyerAuth`
- Then: `req.buyer` is `undefined`, `next()` called, route returns `200`

**M8 — Invalid/expired token: continues as anonymous**
- Given: malformed or expired token
- When: request hits `optionalBuyerAuth`
- Then: `req.buyer` is `undefined`, `next()` called — no `401` issued
