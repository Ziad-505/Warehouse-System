import { Router } from "express";
import { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct } from "../controllers/productController.js";
import { validate } from "../middleware/validate.js";
import { productIdParam, createProductBody, updateProductBody } from "../schemas/productSchema.js";

const router = Router();

router.get("/", getAllProducts);
router.get("/:id", validate({ params: productIdParam }), getProductById);
router.post("/", validate({ body: createProductBody }), createProduct);
router.patch("/:id", validate({ params: productIdParam, body: updateProductBody }), updateProduct);
router.delete("/:id", validate({ params: productIdParam }), deleteProduct);

export default router;