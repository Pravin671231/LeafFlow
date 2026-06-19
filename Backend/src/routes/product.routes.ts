import { Router } from "express";
import * as ctrl from "../controllers/product.controller";

const router = Router();

router.get("/", ctrl.listProducts);
router.get("/:slug", ctrl.getProduct);

export default router;
