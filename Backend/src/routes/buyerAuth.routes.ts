import { Router } from "express";
import { buyerAuth, validate, otpLimiter } from "../middleware";
import * as ctrl from "../controllers/buyerAuth.controller";
import { sendOtpSchema, verifyOtpSchema, oneTapSchema } from "../schemas/buyerAuth.schema";

const router = Router();

router.post("/email/send-otp", otpLimiter, validate(sendOtpSchema), ctrl.sendOtp);
router.post("/email/verify-otp", otpLimiter, validate(verifyOtpSchema), ctrl.verifyOtp);
router.get("/google", ctrl.googleRedirect);
router.get("/google/callback", ctrl.googleCallback);
router.post("/google/one-tap", validate(oneTapSchema), ctrl.oneTap);
router.post("/refresh", ctrl.refresh);
router.post("/logout", buyerAuth, ctrl.logout);
router.get("/me", buyerAuth, ctrl.me);

export default router;
