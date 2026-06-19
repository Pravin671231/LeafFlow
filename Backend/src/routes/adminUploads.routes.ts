import { Router, RequestHandler } from "express";
import { adminAuth, upload } from "../middleware";
import * as ctrl from "../controllers/adminUploads.controller";

const router = Router();

router.use(adminAuth);

// POST /api/admin/uploads/image
router.post("/image", upload as RequestHandler, ctrl.uploadImageHandler);

export default router;
