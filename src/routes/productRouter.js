import { Router } from "express";
import { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct } from "../controllers/productController.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { productIdParam, productListQuery, createProductBody, updateProductBody } from "../schemas/productSchema.js";

const router = Router();

// Router-level: every route below needs a valid token. Putting it here
// rather than per-route means a route added later is protected by where
// it sits, not by someone remembering.
router.use(requireAuth);

router.get("/", validate({ query: productListQuery }), getAllProducts);
router.get("/:id", validate({ params: productIdParam }), getProductById);
router.post("/", requireRole("ADMIN", "STAFF"), validate({ body: createProductBody }), createProduct);
router.patch("/:id", requireRole("ADMIN", "STAFF"), validate({ params: productIdParam, body: updateProductBody }), updateProduct);
router.delete("/:id", requireRole("ADMIN"), validate({ params: productIdParam }), deleteProduct);

export default router;
