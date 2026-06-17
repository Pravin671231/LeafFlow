import { Request, Response } from "express";
import { sendResponse } from "../utils/sendResponse";
import { env } from "../config/env";
import {
  sendEmailOtp,
  verifyEmailOtp,
  refreshBuyerAccessToken,
  logoutBuyer,
  getBuyerProfile,
  handleGoogleCallback,
  handleOneTap,
} from "../services/buyerAuth.service";
import { AppError } from "../utils/AppError";
import { SendOtpBody, VerifyOtpBody, OneTapBody } from "../schemas/buyerAuth.schema";

export async function sendOtp(req: Request, res: Response): Promise<void> {
  const { email } = req.body as SendOtpBody;
  const data = await sendEmailOtp(email);
  sendResponse({ res, data, message: "OTP sent to your email" });
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { otpSessionId, otp } = req.body as VerifyOtpBody;
  const { accessToken, refreshToken } = await verifyEmailOtp(otpSessionId, otp);
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  sendResponse({ res, data: { accessToken }, message: "Login successful" });
}

export async function googleRedirect(_req: Request, res: Response): Promise<void> {
  const { getGoogleAuthUrl } = await import("../services/integrations/google.service.js");
  const url = await getGoogleAuthUrl();
  res.redirect(url);
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  const code = req.query.code as string | undefined;
  if (!code) throw new AppError(400, "MISSING_CODE", "Authorization code is required");
  const { accessToken, refreshToken } = await handleGoogleCallback(code);
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  sendResponse({ res, data: { accessToken }, message: "Google login successful" });
}

export async function oneTap(req: Request, res: Response): Promise<void> {
  const { credential } = req.body as OneTapBody;
  const { accessToken, refreshToken } = await handleOneTap(credential);
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  sendResponse({ res, data: { accessToken }, message: "Google One Tap login successful" });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const raw = req.cookies?.refreshToken as string | undefined;
  if (!raw) throw new AppError(401, "INVALID_REFRESH_TOKEN", "No refresh token provided");
  const data = await refreshBuyerAccessToken(raw);
  sendResponse({ res, data, message: "Access token refreshed" });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const raw = req.cookies?.refreshToken as string | undefined;
  await logoutBuyer(raw);
  res.clearCookie("refreshToken");
  sendResponse({ res, message: "Logged out successfully" });
}

export async function me(req: Request, res: Response): Promise<void> {
  const data = await getBuyerProfile(req.user!.userId);
  sendResponse({ res, data, message: "Profile fetched successfully" });
}
