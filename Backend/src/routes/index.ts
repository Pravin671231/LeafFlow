import { Router } from "express";
import adminAuthRouter from "./admin/auth";
import buyerAuthRouter from "./buyer/auth";

const router = Router();

router.use("/admin/auth", adminAuthRouter);
router.use("/buyer/auth", buyerAuthRouter);

export default router;
