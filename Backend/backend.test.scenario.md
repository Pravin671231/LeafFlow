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
