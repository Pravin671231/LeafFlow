import { Router } from "express";
import { adminAuth, validate } from "../middleware";
import { createCategorySchema, updateCategorySchema } from "../schemas/catalog.schema";
import * as ctrl from "../controllers/adminCategories.controller";

const router = Router();

router.use(adminAuth);

router.get("/", ctrl.listCategories);
router.post("/", validate(createCategorySchema), ctrl.createCategory);
router.patch("/:id", validate(updateCategorySchema), ctrl.updateCategory);
router.delete("/:id", ctrl.deleteCategory);

export default router;
