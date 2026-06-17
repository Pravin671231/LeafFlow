import { Router } from "express";
import adminAuthRouter from "./adminAuth.routes";
import buyerAuthRouter from "./buyerAuth.routes";

const router = Router();

router.use("/admin/auth", adminAuthRouter);
router.use("/buyer/auth", buyerAuthRouter);

export default router;
