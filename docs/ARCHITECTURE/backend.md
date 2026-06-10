# Backend Architecture

## Stack

| Concern | Choice |
|---------|--------|
| Runtime | Node.js ≥ 24.15.0 |
| Framework | Express 5 (TypeScript, CommonJS output) |
| Database | MongoDB 8 via Mongoose |
| Validation | Zod |
| Auth | JWT RS256 (access) + hashed refresh tokens in MongoDB |
| Logging | Pino via `createLogger()` |
| Testing | Vitest + Supertest |

---

## Folder Structure

```
Backend/
├── src/
│   ├── app.ts                        # Express app setup (middleware mount, router)
│   ├── index.ts                      # Server entry (listen, graceful shutdown)
│   ├── config/
│   │   ├── env.ts                    # Zod-validated env singleton — import env from here everywhere
│   │   ├── constants.ts              # App-wide magic numbers / strings
│   │   ├── db.ts                     # Mongoose connect/disconnect
│   │   └── index.ts                  # Re-exports
│   ├── controllers/
│   │   └── adminAuth.controller.ts   # Thin handlers: extract req → service → sendResponse
│   ├── middleware/
│   │   ├── adminAuth.ts              # RS256 JWT guard → populates req.admin
│   │   ├── cors.ts                   # CORS config from env.CORS_ORIGIN
│   │   ├── errorHandler.ts           # Global 4-arg Express error handler (last in app.ts)
│   │   ├── httpLogger.ts             # Pino HTTP request logger
│   │   ├── rateLimiter.ts            # loginLimiter, otpLimiter
│   │   ├── validate.ts               # Zod body validation → AppError with field details
│   │   └── index.ts                  # Re-exports all middleware
│   ├── models/
│   │   ├── Admin.ts                  # IAdmin + AdminSchema
│   │   ├── OtpSession.ts             # IOtpSession + OtpSessionSchema
│   │   ├── RefreshToken.ts           # IRefreshToken + RefreshTokenSchema
│   │   └── index.ts                  # Re-exports all models
│   ├── routes/
│   │   ├── admin/
│   │   │   └── auth.ts               # /api/admin/auth/* endpoints
│   │   └── index.ts                  # Mounts all routers
│   ├── schemas/
│   │   ├── auth.ts                   # Zod schemas + inferred types for auth endpoints
│   │   └── index.ts                  # Re-exports
│   ├── services/
│   │   ├── adminAuth.service.ts      # All admin auth business logic
│   │   ├── email.ts                  # Nodemailer OTP delivery
│   │   ├── otp.ts                    # generateOtp, hashOtp, verifyOtp
│   │   ├── token.ts                  # signAccessToken, createRefreshToken, validateRefreshToken, revokeRefreshToken
│   │   └── index.ts                  # Re-exports
│   ├── utils/
│   │   ├── AppError.ts               # Custom error class (statusCode, code, message, details?)
│   │   ├── logger.ts                 # createLogger(name) → Pino child logger
│   │   └── sendResponse.ts           # Standard success response helper
│   └── scripts/
│       └── seed.ts                   # One-shot admin seeder (excluded from coverage)
└── __tests__/
    ├── admin-auth/                   # API integration tests per endpoint group
    ├── middleware/                   # Middleware unit tests
    ├── models/                       # Model unit tests
    ├── services/                     # Service unit tests
    └── *.test.ts                     # Top-level tests (health, cors, config)
```

**Placement rule for new files**: controllers → `src/controllers/`, services → `src/services/`, Zod schemas → `src/schemas/`, models → `src/models/`, middleware → `src/middleware/`. Always add a re-export to the matching `index.ts`.

---

## Request Lifecycle

```
HTTP Request
  → src/app.ts            corsMiddleware, httpLogger, json body-parser, router mount
  → src/routes/           wire middleware + controller — zero logic
      → rateLimiter?
      → validate(schema)?
      → adminAuth?
  → src/controllers/      extract req fields → call one service fn → sendResponse()
  → src/services/         business logic, DB queries, throw AppError on failure
  → src/models/           Mongoose documents
  → sendResponse()        success path
  → errorHandler          all thrown errors — registered last in app.ts
```

---

## Directory Rules

### `src/config/`
- `env.ts` exports a single validated `env` object. **Import `env` everywhere. Never touch `process.env` outside this file.**
- `constants.ts` holds every magic number and string. No inline literals in business logic.

### `src/routes/`
- One file per resource domain under a namespace folder (e.g., `admin/auth.ts`).
- All routers mounted in `src/routes/index.ts`.
- Route files **only** wire middleware and controllers. Zero logic.
- Middleware order per route: `rateLimiter → validate(schema) → adminAuth → controller`.

```ts
// ✅ correct
router.post("/login", loginLimiter, validate(loginSchema), ctrl.login);
router.get("/me", adminAuth, ctrl.me);
router.post("/reset-password/confirm", adminAuth, validate(resetPasswordConfirmSchema), ctrl.resetPasswordConfirm);
```

### `src/controllers/`
- **Thin**: extract from `req` → call one service function → call `sendResponse()`. Nothing else.
- Never contain business logic, DB queries, or direct model access.
- Always type-cast `req.body` using the Zod-inferred type from `src/schemas/`.
- Never handle errors inline — let them propagate to `errorHandler`.

```ts
// ✅ correct controller
export async function login(req: Request, res: Response): Promise<void> {
  const { loginEmail, password } = req.body as LoginBody;
  const data = await adminAuthService.login(loginEmail, password);
  sendResponse({ res, data, message: "OTP sent to your registered email" });
}
```

### `src/services/`
- All business logic lives here. May query Mongoose models directly.
- Throw `new AppError(statusCode, "ERROR_CODE", "message")` for all expected errors.
- Unexpected errors bubble up as-is and become 500 responses via `errorHandler`.
- Non-exported helper functions are encouraged for shared logic within the file.
- All `import` statements first, then module-level initializations (`const log = createLogger(...)`).

### `src/middleware/`
- `validate(schema)` — maps all Zod issues to `{ field: message }` in `AppError.details`. Place before every controller that reads `req.body`.
- `adminAuth` — verifies RS256 JWT; populates `req.admin: { adminId, role }`.
- `errorHandler` — 4-arg Express error handler. Must be the **last** middleware registered in `app.ts`.
- `rateLimiter` — `loginLimiter` and `otpLimiter` for brute-force–sensitive endpoints.
- All middleware exported from `src/middleware/index.ts`.

### `src/schemas/`
- One file per domain. Export the schema and the inferred TypeScript type.
- Schema name: `<action>Schema`. Type name: `<Action>Body`.

```ts
export const loginSchema = z.object({
  loginEmail: z.email(),
  password: z.string().min(1),
});
export type LoginBody = z.infer<typeof loginSchema>;
```

### `src/models/`
- One file per Mongoose model.
- Define `interface I<Model> extends Document` for the document type.
- Named export: `export const Admin = model<IAdmin>("Admin", AdminSchema)`.
- Always use `{ timestamps: true }` on every schema.

### `src/utils/`
- `AppError` — only custom error class. Use for all expected errors.
- `sendResponse` — only response helper. Use for all success responses.
- `logger` — call `createLogger("name")` for a named Pino child logger.

---

## Mandatory Patterns

### Errors
```ts
// Expected errors — always AppError
throw new AppError(401, "INVALID_CREDENTIALS", "Invalid credentials");

// With field details (validation middleware handles this automatically)
throw new AppError(400, "VALIDATION_ERROR", "Validation failed", { field: "message" });
```

### Success responses
```ts
sendResponse({ res, data, message: "Done" });
sendResponse({ res, statusCode: 201, data, message: "Created" });
sendResponse({ res, message: "Logged out successfully" });  // no data field
```

### Logging
```ts
// After all imports, before any functions
const log = createLogger("serviceName");

log.info({ userId }, "User logged in");
log.warn({ err, adminId }, "OTP email delivery failed — flow continues");
log.error({ err }, "Unhandled error");
```

### Env / config
```ts
import { env } from "../config/env";

env.NODE_ENV === "production"  // ✅
process.env.NODE_ENV           // ❌ never
```

### Import order
```ts
// 1. External packages
import bcrypt from "bcryptjs";
import { Types } from "mongoose";

// 2. Internal modules
import { Admin } from "../models/Admin";
import { AppError } from "../utils/AppError";

// 3. Module-level initializations
const log = createLogger("adminAuth");
```

### Comments — WHY only, never WHAT
```ts
// ❌ remove — restates what the function name already says
// Creates an OTP session and sends the OTP email.

// ✅ keep — explains non-obvious intentional behavior
// Email failure is non-fatal — OTP session is still returned so the client can retry.
```

---

## Error Code Registry

All `AppError` codes used in this codebase. Use an existing code or add a new row here — never hardcode new strings inline.

| Code | Status | Meaning |
|------|--------|---------|
| `VALIDATION_ERROR` | 400 | Zod schema failed; `details` field contains per-field messages |
| `UNAUTHORIZED` | 401 | No / malformed Authorization header |
| `INVALID_TOKEN` | 401 | JWT signature invalid |
| `TOKEN_EXPIRED` | 401 | JWT or session expired |
| `INVALID_CREDENTIALS` | 401 | Wrong email / password |
| `INVALID_OTP` | 401 | Wrong OTP or session not found |
| `OTP_EXPIRED` | 401 | OTP session past `expiresAt` |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token invalid or revoked |
| `ACCOUNT_LOCKED` | 403 | `failedLoginAttempts >= 5` within lock window |
| `NOT_FOUND` | 404 | Resource not found |
| `OTP_MAX_ATTEMPTS` | 429 | OTP attempt count reached `MAX_OTP_ATTEMPTS` |
| `INTERNAL_ERROR` | 500 | Unhandled exception (set by `errorHandler`) |

---

## What NOT To Do

| Prohibited | Use instead |
|-----------|-------------|
| `console.log` | `createLogger("name")` |
| `process.env.X` | `env.X` from `src/config/env.ts` |
| `res.json(...)` directly | `sendResponse(...)` |
| Business logic in controllers | Move to `src/services/` |
| DB queries in controllers | Move to `src/services/` |
| Inline magic numbers / strings | Define in `src/config/constants.ts` |
| Silent `catch {}` without comment | Add a WHY comment explaining intentional suppression |
| What-comments (`// Creates an X`) | Delete them — name the function well instead |
| New error code string inline | Add the code to the Error Code Registry above |
