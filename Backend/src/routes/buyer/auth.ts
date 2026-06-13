import { Router } from "express";
import * as ctrl from "../../controllers/buyerAuth.controller";

const router = Router();

router.post("/email/send-otp", ctrl.sendOtp);
router.post("/email/verify-otp", ctrl.verifyOtp);
router.get("/google", ctrl.googleRedirect);
router.get("/google/callback", ctrl.googleCallback);
router.post("/google/one-tap", ctrl.googleOneTap);
router.post("/refresh", ctrl.refresh);
router.post("/logout", ctrl.logout);
router.get("/me", ctrl.me);

export default router;
