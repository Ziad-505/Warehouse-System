import * as productService from "../services/productService.js";

export const getAllProducts = async (req, res) => {
    try {
        const products = await productService.getAllProducts();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const getProductById = async (req, res) => {
    try {
        const product = await productService.getProductById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.json(product);
    } catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ error: "Product not found" });
          }
        res.status(500).json({ message: error.message });
    }
};




export const createProduct = async (req, res) => {
    try {
        const product = await productService.createProduct(req.body);
        res.status(201).json(product);
    } catch (error) {
        if (error.message === "Category not found" || error.message === "Warehouse not found") {
            return res.status(400).json({ error: error.message });
        }
        if (error.code === "P2002") {
            return res.status(409).json({ error: "Product name already exists" });
        }
        res.status(500).json({ message: error.message });
    }
};



export const updateProduct = async (req, res) => {
    try {
        const product = await productService.updateProduct(req.params.id, req.body);
        res.json(product);
    } catch (error) {
        if (error.message === "Category not found" || error.message === "Warehouse not found") {
            return res.status(400).json({ error: error.message });
        }
        if (error.code === "P2002") {
            return res.status(409).json({ error: "Product name already exists" });
        }
        if (error.code === "P2025") {
            return res.status(404).json({ error: "Product not found" });
          }
        res.status(500).json({ message: error.message });
    }
};


export const deleteProduct = async (req, res) => {
    try {
        const product = await productService.deleteProduct(req.params.id);
        res.json(product);
    } catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ error: "Product not found" });
            }
        res.status(500).json({ message: error.message });
    }
};