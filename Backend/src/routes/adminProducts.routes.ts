import { Router } from "express";
import { adminAuth } from "../middleware";
import * as ctrl from "../controllers/adminProducts.controller";

const router = Router();

router.use(adminAuth);

router.get("/", ctrl.listProducts);
router.post("/", ctrl.createProduct);
router.patch("/:id", ctrl.updateProduct);
router.delete("/:id", ctrl.deleteProduct);

export default router;
