import { Router } from "express";
import adminAuthRouter from "./auth.routes";

const router = Router();

router.use("/admin/auth", adminAuthRouter);

export default router;
