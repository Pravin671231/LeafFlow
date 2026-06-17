import { Request, Response } from "express";
import { sendResponse } from "../utils/sendResponse";
import { env } from "../config/env";
import {
  sendEmailOtp,
  verifyEmailOtp,
  refreshBuyerAccessToken,
  logoutBuyer,
  getBuyerProfile,
} from "../services/buyerAuth.service";
import { AppError } from "../utils/AppError";
import { SendOtpBody, VerifyOtpBody } from "../schemas/buyerAuth.schema";

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

export async function googleRedirect(req: Request, res: Response): Promise<void> {
  sendResponse({ res, statusCode: 501, message: "Not implemented" });
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  sendResponse({ res, statusCode: 501, message: "Not implemented" });
}

export async function oneTap(req: Request, res: Response): Promise<void> {
  sendResponse({ res, statusCode: 501, message: "Not implemented" });
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
