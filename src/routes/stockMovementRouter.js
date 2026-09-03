import { Router } from "express";
import { createStockMovement, transferStock } from "../controllers/stockMovementController.js";
import { validate } from "../middleware/validate.js";
import { createMovementBody, transferBody } from "../schemas/movementSchema.js";

const router = Router();

// Literal paths before any future "/:id" route, so the segment is not read as an id.
router.post("/transfer", validate({ body: transferBody }), transferStock);
router.post("/", validate({ body: createMovementBody }), createStockMovement);

export default router;
