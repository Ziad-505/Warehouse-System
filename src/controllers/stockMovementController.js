import * as stockMovementService from "../services/stockMovementService.js";

export const createStockMovement = async (req, res) => {
    const result = await stockMovementService.createStockMovement(req.valid.body);
    res.status(201).json(result);
};

export const transferStock = async (req, res) => {
    const result = await stockMovementService.transferStock(req.valid.body);
    res.status(201).json(result);
};
