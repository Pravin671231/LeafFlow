import { Router } from "express";
import { adminAuth, validate, loginLimiter, otpLimiter } from "../../middleware";
import * as ctrl from "../../controllers/adminAuth.controller";
import {
  loginSchema,
  verifyOtpSchema,
  forgotPasswordSendSchema,
  forgotPasswordResetSchema,
  resetPasswordConfirmSchema,
} from "../../schemas/auth";

const router = Router();

router.post("/login", loginLimiter, validate(loginSchema), ctrl.login);
router.post("/login/verify-otp", otpLimiter, validate(verifyOtpSchema), ctrl.verifyOtp);
router.post("/refresh", ctrl.refresh);
router.post("/logout", adminAuth, ctrl.logout);
router.get("/me", adminAuth, ctrl.me);
router.post("/forgot-password/send-otp", loginLimiter, validate(forgotPasswordSendSchema), ctrl.forgotPasswordSendOtp);
router.post("/forgot-password/reset", validate(forgotPasswordResetSchema), ctrl.forgotPasswordReset);
router.post("/reset-password/send-otp", adminAuth, ctrl.resetPasswordSendOtp);
router.post("/reset-password/confirm", adminAuth, validate(resetPasswordConfirmSchema), ctrl.resetPasswordConfirm);

export default router;
