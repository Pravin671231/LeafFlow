import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { adminAuth } from "../../middleware/adminAuth";
import * as ctrl from "../../controllers/adminAuth.controller";

const router = Router();

router.post("/login", asyncHandler(ctrl.login));
router.post("/login/verify-otp", asyncHandler(ctrl.verifyOtp));
router.post("/refresh", asyncHandler(ctrl.refresh));
router.post("/logout", adminAuth, asyncHandler(ctrl.logout));
router.get("/me", adminAuth, asyncHandler(ctrl.me));
router.post("/forgot-password/send-otp", asyncHandler(ctrl.forgotPasswordSendOtp));
router.post("/forgot-password/reset", asyncHandler(ctrl.forgotPasswordReset));
router.post("/reset-password/send-otp", adminAuth, asyncHandler(ctrl.resetPasswordSendOtp));
router.post("/reset-password/confirm", adminAuth, asyncHandler(ctrl.resetPasswordConfirm));

export default router;
