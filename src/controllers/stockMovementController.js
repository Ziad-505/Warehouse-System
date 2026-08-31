import * as stockMovementService from "../services/stockMovementService.js";

export const createStockMovement = async (req, res) => {
    const result = await stockMovementService.createStockMovement(req.body);
    res.status(201).json(result);
};
