//--------------- OTP constants --------------------//
// OTP valid for 5 minutes (in milliseconds)
export const OTP_TTL_MS = 5 * 60 * 1000;
// OTP valid for 5 minutes (in seconds)
export const OTP_TTL_SECONDS = 300;
// OTP length (6 digits)
export const OTP_LENGTH = 6;
// Maximum OTP verification attempts
export const MAX_OTP_ATTEMPTS = 5;
// bcrypt salt rounds for OTP hashing
export const BCRYPT_ROUNDS_OTP = 10;

//----------------- Token constants --------------------//
// Access token validity (15 minutes)
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
// Refresh token validity (7 days)
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
// Account lock duration after failed attempts (15 minutes)
export const LOCK_DURATION_MS = 15 * 60 * 1000;
// Maximum wrong login attempts before lock
export const MAX_FAILED_ATTEMPTS = 5;
// Refresh token validity (7 days)
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;



// bcrypt salt rounds for password hashing (higher = more secure but slower)
export const BCRYPT_ROUNDS_PASSWORD = 12;

//----------------- Upload constants --------------------//
export const UPLOAD_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const UPLOAD_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
