import { Router } from "express";
import { createStockMovement, transferStock } from "../controllers/stockMovementController.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createMovementBody, transferBody } from "../schemas/movementSchema.js";

const router = Router();

router.use(requireAuth);

// Literal paths before any future "/:id" route, so the segment is not read as an id.
router.post("/transfer", requireRole("ADMIN", "STAFF"), validate({ body: transferBody }), transferStock);
router.post("/", requireRole("ADMIN", "STAFF"), validate({ body: createMovementBody }), createStockMovement);

export default router;
