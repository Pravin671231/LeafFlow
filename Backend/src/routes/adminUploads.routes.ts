import { Router } from "express";
import { adminAuth } from "../middleware";
import * as ctrl from "../controllers/adminUploads.controller";

const router = Router();

router.use(adminAuth);

// POST /api/admin/uploads/image
router.post("/image", ctrl.uploadImage);

export default router;
