import { Router } from "express";
import { getAllWarehouses, getWarehouseById, getWarehouseStock, createWarehouse, updateWarehouse, deleteWarehouse } from "../controllers/warehouseController.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { warehouseIdParam, warehouseListQuery, createWarehouseBody, updateWarehouseBody } from "../schemas/warehouseSchema.js";

const router = Router();

// Router-level: every route below needs a valid token. Putting it here
// rather than per-route means a route added later is protected by where
// it sits, not by someone remembering.
router.use(requireAuth);

router.get("/", validate({ query: warehouseListQuery }), getAllWarehouses);
router.get("/:id", validate({ params: warehouseIdParam }), getWarehouseById);
router.get("/:id/stock", validate({ params: warehouseIdParam, query: warehouseListQuery }), getWarehouseStock);
router.post("/", requireRole("ADMIN", "STAFF"), validate({ body: createWarehouseBody }), createWarehouse);
router.patch("/:id", requireRole("ADMIN", "STAFF"), validate({ params: warehouseIdParam, body: updateWarehouseBody }), updateWarehouse);
router.delete("/:id", requireRole("ADMIN"), validate({ params: warehouseIdParam }), deleteWarehouse);

export default router;
