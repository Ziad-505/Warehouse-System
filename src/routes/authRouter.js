import { Router } from "express";
import { register, login, refresh, logout } from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";
import { registerBody, loginBody, refreshBody } from "../schemas/authSchema.js";

const router = Router();

// Deliberately public: there is no way to obtain a token otherwise.
router.post("/register", validate({ body: registerBody }), register);
router.post("/login", validate({ body: loginBody }), login);
router.post("/refresh", validate({ body: refreshBody }), refresh);
router.post("/logout", validate({ body: refreshBody }), logout);

export default router;
