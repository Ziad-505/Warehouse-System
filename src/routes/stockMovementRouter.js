import { Router } from "express";
import { createStockMovement, transferStock, getMovements } from "../controllers/stockMovementController.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createMovementBody, transferBody, movementListQuery } from "../schemas/movementSchema.js";

const router = Router();

router.use(requireAuth);

// Reads are open to any authenticated user, VIEWER included: an audit
// trail nobody can read is not much of a control.
router.get("/", validate({ query: movementListQuery }), getMovements);

// Literal paths before any future "/:id" route, so the segment is not read as an id.
router.post("/transfer", requireRole("ADMIN", "STAFF"), validate({ body: transferBody }), transferStock);
router.post("/", requireRole("ADMIN", "STAFF"), validate({ body: createMovementBody }), createStockMovement);

export default router;
