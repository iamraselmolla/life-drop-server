// ─── controllers/auth.controller.js ──────────────────────────────────────────
// Thin layer: validate → call service → send response.
// No SQL here. No business logic here.

import * as AuthService from "./auth.services.js";

// POST /api/auth/register
export async function register(req, res) {
  try {
    const result = await AuthService.registerUser(req.body);
    return res.status(201).json({
      success: true,
      message: "Registration successful. Welcome to LifeDrop!",
      ...result, // { token, user }
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal server error.",
    });
  }
}

// POST /api/auth/login
export async function login(req, res) {
  try {
    const result = await AuthService.loginUser(req.body);
    return res.status(200).json({
      success: true,
      message: "Login successful.",
      ...result, // { token, user }
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal server error.",
    });
  }
}

// GET /api/auth/me  (protected)
export async function getMe(req, res) {
  try {
    const profile = await AuthService.getMyProfile(req.user.userId);
    return res.status(200).json({ success: true, user: profile });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal server error.",
    });
  }
}
