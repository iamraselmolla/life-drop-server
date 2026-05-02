// ─── routes/auth.routes.js ───────────────────────────────────────────────────

import { Router } from "express";
import * as AuthController from "./auth.controller.js";
import { validate } from "../../utils/validate.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { registerSchema, loginSchema } from "./auth.validator.js";

const router = Router();

/**
 * POST /api/auth/register
 * Body: { email, phone, password, name, age, district, division,
 *         blood_group, weight_kg, last_donated_at,
 *         is_smoker, has_hepatitis_b, has_hepatitis_c, has_hiv,
 *         has_diabetes, has_heart_disease, has_malaria_recent }
 * Returns: { success, message, token, user }
 */
router.post("/register", validate(registerSchema), AuthController.register);

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { success, message, token, user }
 */
router.post("/login", validate(loginSchema), AuthController.login);

/**
 * GET /api/auth/me
 * Header: Authorization: Bearer <token>
 * Returns: { success, user } — full profile + medical data
 */
router.get("/me", requireAuth, AuthController.getMe);

export default router;
