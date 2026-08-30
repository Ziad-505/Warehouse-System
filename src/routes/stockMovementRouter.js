import { Router } from "express";
import { createStockMovement } from "../controllers/stockMovementController.js";


const router = Router();

router.post("/", createStockMovement);


export default router;