import * as warehouseService from "../services/warehouseService.js";
import { AppError } from "../lib/AppError.js";

export const getAllWarehouses = async (req, res) => {
    const warehouses = await warehouseService.getAllWarehouses();
    res.json(warehouses);
};

export const getWarehouseById = async (req, res) => {
    const warehouse = await warehouseService.getWarehouseById(req.params.id);
    if (!warehouse) throw new AppError(404, "Warehouse not found");
    res.json(warehouse);
};

export const createWarehouse = async (req, res) => {
    const warehouse = await warehouseService.createWarehouse(req.body);
    res.status(201).json(warehouse);
};

export const updateWarehouse = async (req, res) => {
    const warehouse = await warehouseService.updateWarehouse(req.params.id, req.body);
    res.json(warehouse);
};

export const deleteWarehouse = async (req, res) => {
    const warehouse = await warehouseService.deleteWarehouse(req.params.id);
    res.json(warehouse);
};
