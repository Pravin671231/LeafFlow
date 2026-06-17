import { Router } from "express";
import adminAuthRouter from "./adminAuth.routes";
import adminCategoriesRouter from "./adminCategories.routes";
import adminProductsRouter from "./adminProducts.routes";
import buyerAuthRouter from "./buyerAuth.routes";

const router = Router();

router.use("/admin/auth", adminAuthRouter);
router.use("/admin/categories", adminCategoriesRouter);
router.use("/admin/products", adminProductsRouter);
router.use("/buyer/auth", buyerAuthRouter);

export default router;
