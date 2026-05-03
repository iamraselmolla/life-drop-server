// ─── routes/auth.routes.js ───────────────────────────────────────────────────

import { Router } from "express";
import * as AuthController from "./auth.controller.js";
import { validate } from "../../utils/validate.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { registerSchema, loginSchema } from "./auth.validator.js";

const router = Router();

router.post("/register", validate(registerSchema), AuthController.register);

router.post("/login", validate(loginSchema), AuthController.login);

router.get("/me", requireAuth, AuthController.getMe);

export default router;
