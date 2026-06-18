import { Router } from "express";
import adminAuthRouter from "./adminAuth.routes";
import adminCategoriesRouter from "./adminCategories.routes";
import adminProductsRouter from "./adminProducts.routes";
import adminUploadsRouter from "./adminUploads.routes";
import buyerAuthRouter from "./buyerAuth.routes";
import productRouter from "./product.routes";
import categoryRouter from "./category.routes";

const router = Router();

router.use("/admin/auth", adminAuthRouter);
router.use("/admin/categories", adminCategoriesRouter);
router.use("/admin/products", adminProductsRouter);
router.use("/admin/uploads", adminUploadsRouter);
router.use("/buyer/auth", buyerAuthRouter);
router.use("/products", productRouter);
router.use("/categories", categoryRouter);

export default router;
