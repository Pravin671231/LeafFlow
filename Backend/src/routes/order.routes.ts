import { Router } from "express";
import { buyerAuth, validate } from "../middleware";
import * as ctrl from "../controllers/order.controller";
import { createOrderSchema } from "../schemas/order.schema";

const router = Router();

router.post("/", buyerAuth, validate(createOrderSchema), ctrl.createOrder);

export default router;
