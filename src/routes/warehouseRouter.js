import { Router } from "express";
import { getAllWarehouses, getWarehouseById, createWarehouse, updateWarehouse, deleteWarehouse } from "../controllers/warehouseController.js";

const router = Router();

router.get("/", getAllWarehouses);
router.get("/:id", getWarehouseById);
router.post("/", createWarehouse);
router.patch("/:id", updateWarehouse);
router.delete("/:id", deleteWarehouse);

export default router;