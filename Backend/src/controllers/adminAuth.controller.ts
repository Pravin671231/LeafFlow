import { Request, Response } from "express";
import { sendResponse } from "../utils/sendResponse";
import * as adminAuthService from "../services/adminAuth.service";
import type {
  LoginBody,
  VerifyOtpBody,
  ForgotPasswordSendBody,
  ForgotPasswordResetBody,
  ResetPasswordConfirmBody,
} from "../schemas/auth";

export async function login(req: Request, res: Response): Promise<void> {
  const { loginEmail, password } = req.body as LoginBody;
  const data = await adminAuthService.login(loginEmail, password);
  sendResponse({ res, data, message: "OTP sent to your registered email" });
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { otpSessionId, otp } = req.body as VerifyOtpBody;
  const { accessToken, rawRefresh } = await adminAuthService.verifyOtpAndIssueTokens(otpSessionId, otp);
  res.cookie("refreshToken", rawRefresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  sendResponse({ res, data: { accessToken }, message: "Login successful" });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const raw = req.cookies?.refreshToken as string | undefined;
  if (!raw) {
    sendResponse({ res, statusCode: 401, success: false, message: "No refresh token" });
    return;
  }
  const data = await adminAuthService.refreshAccessToken(raw);
  sendResponse({ res, data, message: "Access token refreshed" });
}

export async function logout(req: Request, res: Response): Promise<void> {
  await adminAuthService.logoutAdmin(req.cookies?.refreshToken);
  res.clearCookie("refreshToken");
  sendResponse({ res, message: "Logged out successfully" });
}

export async function me(req: Request, res: Response): Promise<void> {
  const data = await adminAuthService.getAdminProfile(req.admin!.adminId);
  sendResponse({ res, data });
}

export async function forgotPasswordSendOtp(req: Request, res: Response): Promise<void> {
  const { loginEmail } = req.body as ForgotPasswordSendBody;
  await adminAuthService.forgotPasswordSendOtp(loginEmail);
  sendResponse({ res, message: "OTP sent to your registered email" });
}

export async function forgotPasswordReset(req: Request, res: Response): Promise<void> {
  const { otpSessionId, otp, newPassword } = req.body as ForgotPasswordResetBody;
  await adminAuthService.forgotPasswordReset(otpSessionId, otp, newPassword);
  sendResponse({ res, message: "Password reset successfully" });
}

export async function resetPasswordSendOtp(req: Request, res: Response): Promise<void> {
  await adminAuthService.resetPasswordSendOtp(req.admin!.adminId);
  sendResponse({ res, message: "OTP sent to your registered email" });
}

export async function resetPasswordConfirm(req: Request, res: Response): Promise<void> {
  const { otpSessionId, otp, newPassword } = req.body as ResetPasswordConfirmBody;
  await adminAuthService.resetPasswordConfirm(req.admin!.adminId, otpSessionId, otp, newPassword);
  sendResponse({ res, message: "Password updated successfully" });
}
