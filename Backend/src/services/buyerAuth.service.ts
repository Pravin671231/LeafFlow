import { OAuth2Client } from "google-auth-library";
import { Types } from "mongoose";

import { User } from "../models/User";
import { OtpSession } from "../models/OtpSession";
import { AppError } from "../utils/AppError";
import { createLogger } from "../utils/logger";
import { generateOtp, hashOtp, verifyOtp as verifyOtpHash } from "./otp";
import { sendOtpEmail } from "./email";
import {
  signBuyerAccessToken,
  createBuyerRefreshToken,
  validateBuyerRefreshToken,
  revokeRefreshToken,
} from "./token";
import { env } from "../config/env";
import { OTP_TTL_MS, OTP_TTL_SECONDS, MAX_OTP_ATTEMPTS } from "../config/constants";

const log = createLogger("buyerAuth");

// ─── helpers ─────────────────────────────────────────────────────────────────

function requireGoogleEnv(): { clientId: string; clientSecret: string; redirectUri: string } {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw new AppError(500, "INTERNAL_ERROR", "Google OAuth is not configured");
  }
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
  };
}

async function findOrCreateGoogleUser(googleId: string, email: string, name: string) {
  const byGoogleId = await User.findOne({ googleId });
  if (byGoogleId) return byGoogleId;

  const byEmail = await User.findOne({ email });
  if (byEmail) {
    byEmail.googleId = googleId;
    if (!byEmail.name) byEmail.name = name;
    await byEmail.save();
    return byEmail;
  }

  return User.create({ email, googleId, name, isVerified: true, role: "buyer" });
}

async function issueTokensForUser(userId: Types.ObjectId) {
  const rawRefresh = await createBuyerRefreshToken(userId);
  const accessToken = signBuyerAccessToken({ userId: userId.toString(), role: "buyer" });
  return { accessToken, rawRefresh };
}

// ─── email OTP ────────────────────────────────────────────────────────────────

export async function sendOtp(
  email: string
): Promise<{ otpSessionId: string; expiresInSeconds: number }> {
  const existing = await User.findOne({ email });
  if (!existing) {
    await User.create({ email, name: email.split("@")[0], isVerified: false, role: "buyer" });
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const session = await OtpSession.create({
    purpose: "buyer_login",
    identifier: email,
    otpHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    attemptCount: 0,
  });

  try {
    await sendOtpEmail(email, otp);
  } catch (err) {
    log.warn({ err, email }, "OTP email delivery failed — buyer_login flow continues");
  }

  return { otpSessionId: session._id.toString(), expiresInSeconds: OTP_TTL_SECONDS };
}

export async function verifyOtpAndIssueTokens(
  otpSessionId: string,
  otp: string
): Promise<{ accessToken: string; rawRefresh: string }> {
  const session = await OtpSession.findById(otpSessionId);
  if (!session || session.purpose !== "buyer_login") {
    throw new AppError(401, "INVALID_OTP", "Invalid OTP session");
  }
  if (session.expiresAt < new Date()) throw new AppError(401, "OTP_EXPIRED", "OTP has expired");
  if (session.attemptCount >= MAX_OTP_ATTEMPTS) {
    throw new AppError(429, "OTP_MAX_ATTEMPTS", "Too many attempts");
  }

  const valid = await verifyOtpHash(otp, session.otpHash);
  if (!valid) {
    session.attemptCount += 1;
    await session.save();
    throw new AppError(401, "INVALID_OTP", "Invalid OTP");
  }

  await OtpSession.deleteOne({ _id: session._id });

  const user = await User.findOne({ email: session.identifier });
  if (!user) throw new AppError(401, "INVALID_OTP", "User not found");

  if (!user.isVerified) {
    user.isVerified = true;
    await user.save();
  }

  return issueTokensForUser(user._id as Types.ObjectId);
}

// ─── Google OAuth redirect ────────────────────────────────────────────────────

export function getGoogleAuthUrl(): string {
  const { clientId, clientSecret, redirectUri } = requireGoogleEnv();
  const client = new OAuth2Client(clientId, clientSecret, redirectUri);
  return client.generateAuthUrl({
    access_type: "offline",
    scope: ["email", "profile"],
    prompt: "consent",
  });
}

export async function handleGoogleCallback(
  code: string
): Promise<{ accessToken: string; rawRefresh: string }> {
  const { clientId, clientSecret, redirectUri } = requireGoogleEnv();
  const client = new OAuth2Client(clientId, clientSecret, redirectUri);

  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) throw new AppError(401, "INVALID_TOKEN", "No ID token in Google response");

  client.setCredentials(tokens);
  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
  const googlePayload = ticket.getPayload();
  if (!googlePayload?.email) throw new AppError(401, "INVALID_TOKEN", "Google account has no email");

  const user = await findOrCreateGoogleUser(
    googlePayload.sub,
    googlePayload.email,
    googlePayload.name ?? googlePayload.email
  );
  return issueTokensForUser(user._id as Types.ObjectId);
}

// ─── Google One Tap ───────────────────────────────────────────────────────────

export async function handleGoogleOneTap(
  credential: string
): Promise<{ accessToken: string; rawRefresh: string }> {
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new AppError(500, "INTERNAL_ERROR", "Google OAuth is not configured");

  const client = new OAuth2Client(clientId);
  let googlePayload;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    googlePayload = ticket.getPayload();
  } catch {
    throw new AppError(401, "INVALID_TOKEN", "Invalid Google credential");
  }

  if (!googlePayload?.email) throw new AppError(401, "INVALID_TOKEN", "Google account has no email");

  const user = await findOrCreateGoogleUser(
    googlePayload.sub,
    googlePayload.email,
    googlePayload.name ?? googlePayload.email
  );
  return issueTokensForUser(user._id as Types.ObjectId);
}

// ─── session management ───────────────────────────────────────────────────────

export async function refreshBuyerAccessToken(raw: string): Promise<{ accessToken: string }> {
  let userId: string;
  try {
    const result = await validateBuyerRefreshToken(raw);
    userId = result.userId.toString();
  } catch {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
  }
  const accessToken = signBuyerAccessToken({ userId, role: "buyer" });
  return { accessToken };
}

export async function logoutBuyer(raw?: string): Promise<void> {
  if (!raw) return;
  try {
    const { tokenHash } = await validateBuyerRefreshToken(raw);
    await revokeRefreshToken(tokenHash);
  } catch {
    // Token not found or already revoked — proceed silently
  }
}

export async function getBuyerProfile(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
  return user;
}
