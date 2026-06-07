import { Router } from "express";
import adminAuthRouter from "./admin/auth";

const router = Router();

router.use("/admin/auth", adminAuthRouter);

export default router;
