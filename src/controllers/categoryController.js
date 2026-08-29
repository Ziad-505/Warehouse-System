import * as categoryService from "../services/categoryService.js";

export const getAllCategories = async (req, res) => {
    try {
        const categories = await categoryService.getAllCategories();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const getCategoryById = async (req, res) => {
    try {
        const category = await categoryService.getCategoryById(req.params.id);
        if (!category) {
            return res.status(404).json({ error: "Category not found" });
        }
        res.json(category);
    } catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ error: "Category not found" });
          }
        res.status(500).json({ message: error.message });
    }
};




export const createCategory = async (req, res) => {
    try {
        const category = await categoryService.createCategory(req.body);
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



export const updateCategory = async (req, res) => {
    try {
        const category = await categoryService.updateCategory(req.params.id, req.body);
        res.json(category);
    } catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ error: "Category not found" });
          }
        res.status(500).json({ message: error.message });
    }
};


export const deleteCategory = async (req, res) => {
    try {
        const category = await categoryService.deleteCategory(req.params.id);
        res.json(category);
    } catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ error: "Category not found" });
            }
        res.status(500).json({ message: error.message });
    }
};