import { Router } from "express";
import { adminAuth, validate } from "../middleware";
import { createProductSchema, updateProductSchema } from "../schemas/product.schema";
import * as ctrl from "../controllers/adminProducts.controller";

const router = Router();

router.use(adminAuth);

router.get("/", ctrl.listProducts);
router.post("/", validate(createProductSchema), ctrl.createProduct);
router.patch("/:id", validate(updateProductSchema), ctrl.updateProduct);
router.delete("/:id", ctrl.deleteProduct);

export default router;
