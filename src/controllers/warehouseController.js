import * as warehouseService from "../services/warehouseService.js";

export const getAllWarehouses = async (req, res) => {
    try {
        const wareHouses = await warehouseService.getAllWarehouses();
        res.json(wareHouses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const getWarehouseById = async (req, res) => {
    try {
        const wareHouses = await warehouseService.getWarehouseById(req.params.id);
        if (!wareHouses) {
            return res.status(404).json({ error: "Warehouse not found" });
        }
        res.json(wareHouses);
    } catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ error: "Warehouse not found" });
          }
        res.status(500).json({ message: error.message });
    }
};




export const createWarehouse = async (req, res) => {
    try {
        const wareHouses = await warehouseService.createWarehouse(req.body);
        res.status(201).json(wareHouses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



export const updateWarehouse = async (req, res) => {
    try {
        const wareHouses = await warehouseService.updateWarehouse(req.params.id, req.body);
        res.json(wareHouses);
    } catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ error: "Warehouse not found" });
          }
        res.status(500).json({ message: error.message });
    }
};


export const deleteWarehouse = async (req, res) => {
    try {
        const wareHouses = await warehouseService.deleteWarehouse(req.params.id);
        res.json(wareHouses);
    } catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ error: "Warehouse not found" });
            }
        res.status(500).json({ message: error.message });
    }
};