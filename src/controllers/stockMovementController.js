import * as stockMovementService from "../services/stockMovementService.js";

export const createStockMovement = async (req, res) => {
    const result = await stockMovementService.createStockMovement({
        ...req.valid.body,
        userId: req.user.id,   // from the signed token. NEVER from the body.
    });
    res.status(201).json(result);
};

export const transferStock = async (req, res) => {
    const result = await stockMovementService.transferStock({
        ...req.valid.body,
        userId: req.user.id,
    });
    res.status(201).json(result);
};

export const getMovements = async (req, res) => {
    const result = await stockMovementService.getMovements(req.valid.query);
    res.json(result);
};
