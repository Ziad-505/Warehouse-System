import * as stockMovementService from "../services/stockMovementService.js";

const BAD_REQUEST = new Set([
    "Invalid productId",
    "Invalid movement type",
    "Quantity is required",
    "Quantity must be an integer",
    "Quantity cannot be negative",
    "Quantity must be greater than zero",
    "Insufficient stock",
]);

export const createStockMovement = async (req, res) => {
    try {
        const result = await stockMovementService.createStockMovement(req.body);
        res.status(201).json(result);
    } catch (error) {
        if (error.message === "Product not found") {
            return res.status(404).json({ error: error.message });
        }
        if (BAD_REQUEST.has(error.message)) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};
