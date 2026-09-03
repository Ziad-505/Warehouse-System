import * as productService from "../services/productService.js";
import { AppError } from "../lib/AppError.js";

export const getAllProducts = async (req, res) => {
    const result = await productService.getAllProducts(req.valid.query);
    res.json(result);
};

export const getProductById = async (req, res) => {
    const product = await productService.getProductById(req.valid.params.id);
    if (!product) throw new AppError(404, "Product not found");
    res.json(product);
};

export const createProduct = async (req, res) => {
    const product = await productService.createProduct(req.valid.body);
    res.status(201).json(product);
};

export const updateProduct = async (req, res) => {
    const product = await productService.updateProduct(req.valid.params.id, req.valid.body);
    res.json(product);
};

export const deleteProduct = async (req, res) => {
    const product = await productService.deleteProduct(req.valid.params.id);
    res.json(product);
};
