import { Router } from "express";
import adminAuthRouter from "./adminAuth";
import buyerAuthRouter from "./buyerAuth";

const router = Router();

router.use("/admin/auth", adminAuthRouter);
router.use("/buyer/auth", buyerAuthRouter);

export default router;
