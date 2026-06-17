import { Request, Response } from "express";
import { sendResponse } from "../utils/sendResponse";
import { env } from "../config/env";
import { sendEmailOtp, verifyEmailOtp } from "../services/buyerAuth.service";
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
  sendResponse({ res, statusCode: 501, message: "Not implemented" });
}

export async function logout(req: Request, res: Response): Promise<void> {
  sendResponse({ res, statusCode: 501, message: "Not implemented" });
}

export async function me(req: Request, res: Response): Promise<void> {
  sendResponse({ res, statusCode: 501, message: "Not implemented" });
}
