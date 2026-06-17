import { Request, Response } from "express";
import { sendResponse } from "../utils/sendResponse";
import { sendEmailOtp } from "../services/buyerAuth.service";
import { SendOtpBody } from "../schemas/buyerAuth.schema";

export async function sendOtp(req: Request, res: Response): Promise<void> {
  const { email } = req.body as SendOtpBody;
  const data = await sendEmailOtp(email);
  sendResponse({ res, data, message: "OTP sent to your email" });
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  sendResponse({ res, statusCode: 501, message: "Not implemented" });
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
