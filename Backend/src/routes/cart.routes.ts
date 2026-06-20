import { Router } from "express";
import { buyerAuth, validate } from "../middleware";
import * as ctrl from "../controllers/cart.controller";
import { cartReplaceSchema } from "../schemas/cart.schema";

const router = Router();

router.get("/", buyerAuth, ctrl.getCart);
router.put("/", buyerAuth, validate(cartReplaceSchema), ctrl.replaceCart);

export default router;
