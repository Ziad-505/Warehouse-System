import { Router } from "express";
import { createStockMovement } from "../controllers/stockMovementController.js";
import { validate } from "../middleware/validate.js";
import { createMovementBody } from "../schemas/movementSchema.js";

const router = Router();

router.post("/", validate({ body: createMovementBody }), createStockMovement);


export default router;