import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { categoryIdParam, createCategoryBody, updateCategoryBody, listQuery } from "../schemas/categorySchema.js";
import { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from "../controllers/categoryController.js";

const router = Router();

router.get("/",validate({ query: listQuery }), getAllCategories);
router.get("/:id", validate({ params: categoryIdParam }), getCategoryById);
router.post("/", validate({ body: createCategoryBody }), createCategory);
router.patch("/:id", validate({ params: categoryIdParam, body: updateCategoryBody }), updateCategory);
router.delete("/:id", validate({ params: categoryIdParam }), deleteCategory);

export default router;