import { Router } from "express";
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

router.post("/login", validate(loginSchema), ctrl.login);
router.post("/login/verify-otp", validate(verifyOtpSchema), ctrl.verifyOtp);
router.post("/refresh", ctrl.refresh);
router.post("/logout", adminAuth, ctrl.logout);
router.get("/me", adminAuth, ctrl.me);
router.post("/forgot-password/send-otp", validate(forgotPasswordSendSchema), ctrl.forgotPasswordSendOtp);
router.post("/forgot-password/reset", validate(forgotPasswordResetSchema), ctrl.forgotPasswordReset);
router.post("/reset-password/send-otp", adminAuth, ctrl.resetPasswordSendOtp);
router.post("/reset-password/confirm", adminAuth, validate(resetPasswordConfirmSchema), ctrl.resetPasswordConfirm);

export default router;
