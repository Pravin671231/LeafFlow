import { Router } from "express";
import { validate, buyerAuth, loginLimiter, otpLimiter } from "../middleware";
import * as ctrl from "../controllers/buyerAuth.controller";
import { sendOtpSchema, verifyBuyerOtpSchema, googleOneTapSchema } from "../schemas/buyerAuth.schema";

const router = Router();

router.post("/email/send-otp", loginLimiter, validate(sendOtpSchema), ctrl.sendOtp);
router.post("/email/verify-otp", otpLimiter, validate(verifyBuyerOtpSchema), ctrl.verifyOtp);
router.get("/google", ctrl.googleRedirect);
router.get("/google/callback", ctrl.googleCallback);
router.post("/google/one-tap", validate(googleOneTapSchema), ctrl.googleOneTap);
router.post("/refresh", ctrl.refresh);
router.post("/logout", buyerAuth, ctrl.logout);
router.get("/me", buyerAuth, ctrl.me);

export default router;
