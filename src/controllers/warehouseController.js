import * as warehouseService from "../services/warehouseService.js";
import { AppError } from "../lib/AppError.js";

export const getAllWarehouses = async (req, res) => {
    const result = await warehouseService.getAllWarehouses(req.valid.query);
    res.json(result);
};

export const getWarehouseById = async (req, res) => {
    const warehouse = await warehouseService.getWarehouseById(req.valid.params.id);
    if (!warehouse) throw new AppError(404, "Warehouse not found");
    res.json(warehouse);
};

export const getWarehouseStock = async (req, res) => {
    // A warehouse that exists but holds nothing is an empty list, not a 404 --
    // so the existence check has to happen before we look at stock levels.
    const warehouse = await warehouseService.getWarehouseById(req.valid.params.id);
    if (!warehouse) throw new AppError(404, "Warehouse not found");

    const result = await warehouseService.getWarehouseStock(req.valid.params.id, req.valid.query);
    res.json(result);
};

export const createWarehouse = async (req, res) => {
    const warehouse = await warehouseService.createWarehouse(req.valid.body);
    res.status(201).json(warehouse);
};

export const updateWarehouse = async (req, res) => {
    const warehouse = await warehouseService.updateWarehouse(req.valid.params.id, req.valid.body);
    res.json(warehouse);
};

export const deleteWarehouse = async (req, res) => {
    const warehouse = await warehouseService.deleteWarehouse(req.valid.params.id);
    res.json(warehouse);
};
