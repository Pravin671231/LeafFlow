# Feature: Admin Auth Frontend (Issue #36)

## Unit Tests — authSlice

| ID | Description | Input | Expected |
|----|-------------|-------|----------|
| U1 | Initial state is correct | `authReducer(undefined, { type: '@@INIT' })` | `{ admin: null, isAuthenticated: false, accessToken: null }` |
| U2 | `setCredentials` populates state | `{ admin: mockAdmin, accessToken: 'tok' }` | `isAuthenticated: true`, `admin === mockAdmin`, `accessToken === 'tok'` |
| U3 | `clearCredentials` resets pre-populated state | pre-load `{ admin: mockAdmin, isAuthenticated: true, accessToken: 'tok' }`, dispatch `clearCredentials()` | `{ admin: null, isAuthenticated: false, accessToken: null }` |

## Unit Tests — RequireAuth

| ID | Description | Input | Expected |
|----|-------------|-------|----------|
| U4 | Renders `<Outlet />` when authenticated | Redux store with `isAuthenticated: true`, route `/dashboard` | Child route content visible |
| U5 | Redirects to `/login` when not authenticated | Redux store with `isAuthenticated: false`, route `/dashboard` | Location path becomes `/login` |

## Integration Tests — Login page (Given/When/Then)

**I1 — Renders login form fields**
- Given: `/login` route is rendered
- When: component mounts
- Then: email text input, password input, and submit button are in the document

**I2 — Valid credentials → navigate to OTP page**
- Given: MSW returns `{ success: true, otpSessionId: 'sess1', expiresInSeconds: 300 }` on `POST /api/admin/auth/login`
- When: user types a valid email + password and clicks submit
- Then: navigated to `/login/verify-otp`; `otpSessionId` available via location state

**I3 — Wrong credentials → inline error, no navigation**
- Given: MSW returns HTTP 401 `{ success: false, code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }` on `POST /api/admin/auth/login`
- When: user submits
- Then: "Invalid credentials" text is visible; URL stays `/login`

**I4 — Empty form → no API call**
- Given: both fields are empty
- When: user submits
- Then: required-field validation blocks submission; no MSW handler called

## Integration Tests — LoginVerifyOtp page (Given/When/Then)

**I5 — Renders OTP form with countdown**
- Given: `/login/verify-otp` rendered with `{ otpSessionId: 'sess1', loginEmail: 'admin@leafflow.com' }` in location state
- When: component mounts
- Then: OTP input, submit button, and 5-minute countdown text are visible

**I6 — Valid OTP → store updated, navigate to /dashboard**
- Given: MSW returns `{ success: true, accessToken: 'jwt', admin: { id: '1', loginEmail: 'admin@leafflow.com', otpDeliveryEmail: 'pravin@gmail.com' } }` on `POST /api/admin/auth/login/verify-otp`
- When: user types 6-digit OTP and submits
- Then: Redux store has `isAuthenticated: true`; navigated to `/dashboard`

**I7 — Invalid OTP → error message, stay on page**
- Given: MSW returns HTTP 400 `{ success: false, code: 'OTP_INVALID', message: 'Invalid OTP' }` on `POST /api/admin/auth/login/verify-otp`
- When: user submits OTP
- Then: error message visible; stays on `/login/verify-otp`

**I8 — Resend button 60-second cooldown**
- Given: page rendered; fake timers active
- When: user clicks Resend
- Then: button becomes disabled immediately; after `vi.advanceTimersByTime(60000)` button is enabled again

## Integration Tests — ForgotPassword page (Given/When/Then)

**I9 — Step 1 renders email input**
- Given: `/forgot-password` rendered
- When: component mounts
- Then: email input and "Send OTP" button visible

**I10 — Step 1 submit → advances to Step 2 (OTP entry)**
- Given: MSW returns `{ success: true, otpSessionId: 'sess2' }` on `POST /api/admin/auth/forgot-password/send-otp`
- When: user types email and submits
- Then: OTP input field visible (step 2)

**I11 — Step 2 OTP submit → advances to Step 3 (new password)**
- Given: step 2 visible; MSW not needed (OTP stored locally for reset call)
- When: user types 6-digit OTP and clicks Next/Verify
- Then: new password and confirm password fields visible (step 3)

**I12 — Step 3 matching passwords → success, navigate to /login**
- Given: MSW returns `{ success: true, message: 'Password reset successfully' }` on `POST /api/admin/auth/forgot-password/reset`
- When: user types matching new password + confirm and submits
- Then: navigated to `/login`

**I13 — Step 3 mismatched passwords → inline error, no API call**
- Given: step 3 visible
- When: user types different values in new password and confirm password
- Then: "Passwords do not match" visible; no MSW handler called
