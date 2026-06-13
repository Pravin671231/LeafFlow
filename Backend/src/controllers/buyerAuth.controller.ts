import { Request, Response } from "express";
import { env } from "../config/env";
import { sendResponse } from "../utils/sendResponse";
import { AppError } from "../utils/AppError";
import * as buyerAuthService from "../services/buyerAuth.service";
import type { SendOtpBody, VerifyBuyerOtpBody, GoogleOneTapBody } from "../schemas/buyerAuth.schema";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setRefreshCookie(res: Response, raw: string): void {
  res.cookie("refreshToken", raw, REFRESH_COOKIE_OPTIONS);
}

export async function sendOtp(req: Request, res: Response): Promise<void> {
  const { email } = req.body as SendOtpBody;
  const data = await buyerAuthService.sendOtp(email);
  sendResponse({ res, data, message: "OTP sent to your email" });
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { otpSessionId, otp } = req.body as VerifyBuyerOtpBody;
  const { accessToken, rawRefresh } = await buyerAuthService.verifyOtpAndIssueTokens(otpSessionId, otp);
  setRefreshCookie(res, rawRefresh);
  sendResponse({ res, data: { accessToken }, message: "Login successful" });
}

export async function googleRedirect(_req: Request, res: Response): Promise<void> {
  const url = buyerAuthService.getGoogleAuthUrl();
  res.redirect(url);
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  const code = req.query.code as string | undefined;
  if (!code) throw new AppError(400, "VALIDATION_ERROR", "Missing OAuth code");
  const { accessToken, rawRefresh } = await buyerAuthService.handleGoogleCallback(code);
  setRefreshCookie(res, rawRefresh);
  sendResponse({ res, data: { accessToken }, message: "Google login successful" });
}

export async function googleOneTap(req: Request, res: Response): Promise<void> {
  const { credential } = req.body as GoogleOneTapBody;
  const { accessToken, rawRefresh } = await buyerAuthService.handleGoogleOneTap(credential);
  setRefreshCookie(res, rawRefresh);
  sendResponse({ res, data: { accessToken }, message: "Google login successful" });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const raw = req.cookies?.refreshToken as string | undefined;
  if (!raw) {
    sendResponse({ res, statusCode: 401, success: false, message: "No refresh token" });
    return;
  }
  const data = await buyerAuthService.refreshBuyerAccessToken(raw);
  sendResponse({ res, data, message: "Access token refreshed" });
}

export async function logout(req: Request, res: Response): Promise<void> {
  await buyerAuthService.logoutBuyer(req.cookies?.refreshToken);
  res.clearCookie("refreshToken");
  sendResponse({ res, message: "Logged out successfully" });
}

export async function me(req: Request, res: Response): Promise<void> {
  const data = await buyerAuthService.getBuyerProfile(req.buyer!.userId);
  sendResponse({ res, data });
}
