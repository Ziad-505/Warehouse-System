import * as categoryService from "../services/categoryService.js";
import { AppError } from "../lib/AppError.js";


export const getAllCategories = async (req, res) => {
    const { page, limit, search } = req.valid.query;
    const categories = await categoryService.getAllCategories({ page, limit, search });
    res.json(categories);
};

export const getCategoryById = async (req, res) => {
    const category = await categoryService.getCategoryById(req.valid.params.id);
    if (!category) throw new AppError(404, "Category not found");
    res.json(category);
};

export const createCategory = async (req, res) => {
    const category = await categoryService.createCategory(req.valid.body);
    res.status(201).json(category);
};

export const updateCategory = async (req, res) => {
    const category = await categoryService.updateCategory(req.valid.params.id, req.valid.body);
    res.json(category);
};

export const deleteCategory = async (req, res) => {
    const category = await categoryService.deleteCategory(req.valid.params.id);
    res.json(category);
};
