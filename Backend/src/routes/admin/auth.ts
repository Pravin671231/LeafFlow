import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { adminAuth } from "../../middleware/adminAuth";
import { validate } from "../../middleware/validate";
import * as ctrl from "../../controllers/adminAuth.controller";
import {
  loginSchema,
  verifyOtpSchema,
  forgotPasswordSendSchema,
  forgotPasswordResetSchema,
  resetPasswordConfirmSchema,
} from "../../schemas/auth";

const router = Router();

router.post("/login", validate(loginSchema), asyncHandler(ctrl.login));
router.post("/login/verify-otp", validate(verifyOtpSchema), asyncHandler(ctrl.verifyOtp));
router.post("/refresh", asyncHandler(ctrl.refresh));
router.post("/logout", adminAuth, asyncHandler(ctrl.logout));
router.get("/me", adminAuth, asyncHandler(ctrl.me));
router.post("/forgot-password/send-otp", validate(forgotPasswordSendSchema), asyncHandler(ctrl.forgotPasswordSendOtp));
router.post("/forgot-password/reset", validate(forgotPasswordResetSchema), asyncHandler(ctrl.forgotPasswordReset));
router.post("/reset-password/send-otp", adminAuth, asyncHandler(ctrl.resetPasswordSendOtp));
router.post("/reset-password/confirm", adminAuth, validate(resetPasswordConfirmSchema), asyncHandler(ctrl.resetPasswordConfirm));

export default router;
