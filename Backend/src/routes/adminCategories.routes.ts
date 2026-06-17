import { Router } from "express";
import { adminAuth } from "../middleware";
import * as ctrl from "../controllers/adminCategories.controller";

const router = Router();

router.use(adminAuth);

router.get("/", ctrl.listCategories);
router.post("/", ctrl.createCategory);
router.patch("/:id", ctrl.updateCategory);
router.delete("/:id", ctrl.deleteCategory);

export default router;
