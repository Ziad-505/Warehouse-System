import * as categoryService from "../services/categoryService.js";
import { AppError } from "../lib/AppError.js";

// No try/catch anywhere below: Express 5 forwards a rejected promise from an
// async handler straight to the error middleware.

export const getAllCategories = async (req, res) => {
    const categories = await categoryService.getAllCategories();
    res.json(categories);
};

export const getCategoryById = async (req, res) => {
    const category = await categoryService.getCategoryById(req.params.id);
    if (!category) throw new AppError(404, "Category not found");
    res.json(category);
};

export const createCategory = async (req, res) => {
    const category = await categoryService.createCategory(req.body);
    res.status(201).json(category);
};

export const updateCategory = async (req, res) => {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    res.json(category);
};

export const deleteCategory = async (req, res) => {
    const category = await categoryService.deleteCategory(req.params.id);
    res.json(category);
};
