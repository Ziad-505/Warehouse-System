import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { categoryIdParam, categoryListQuery, createCategoryBody, updateCategoryBody } from "../schemas/categorySchema.js";
import { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from "../controllers/categoryController.js";

const router = Router();

// Router-level: every route below needs a valid token. Putting it here
// rather than per-route means a route added later is protected by where
// it sits, not by someone remembering.
router.use(requireAuth);

router.get("/", validate({ query: categoryListQuery }), getAllCategories);
router.get("/:id", validate({ params: categoryIdParam }), getCategoryById);
router.post("/", requireRole("ADMIN", "STAFF"), validate({ body: createCategoryBody }), createCategory);
router.patch("/:id", requireRole("ADMIN", "STAFF"), validate({ params: categoryIdParam, body: updateCategoryBody }), updateCategory);
router.delete("/:id", requireRole("ADMIN"), validate({ params: categoryIdParam }), deleteCategory);

export default router;