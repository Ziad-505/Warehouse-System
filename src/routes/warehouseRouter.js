import { Router } from "express";
import { getAllWarehouses, getWarehouseById, createWarehouse, updateWarehouse, deleteWarehouse } from "../controllers/warehouseController.js";
import { validate } from "../middleware/validate.js";
import { warehouseIdParam, createWarehouseBody, updateWarehouseBody } from "../schemas/warehouseSchema.js";

const router = Router();

router.get("/", getAllWarehouses);
router.get("/:id", validate({ params: warehouseIdParam }), getWarehouseById);
router.post("/", validate({ body: createWarehouseBody }), createWarehouse);
router.patch("/:id", validate({ params: warehouseIdParam, body: updateWarehouseBody }), updateWarehouse);
router.delete("/:id", validate({ params: warehouseIdParam }), deleteWarehouse);

export default router;