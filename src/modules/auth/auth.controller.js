import * as AuthService from "./auth.services.js";
import sendResponse from "../../utils/sendResponse.js";

// POST /api/auth/register
export async function register(req, res, next) {
  try {
    const result = await AuthService.registerUser(req.body);

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Registration successful.",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
export async function login(req, res, next) {
  try {
    const result = await AuthService.loginUser(req.body);
    sendResponse(res, {
      status: 200,
      success: true,
      message: "Login successful.",
      user: result,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me  (protected)
export async function getMe(req, res, next) {
  try {
    const profile = await AuthService.getMyProfile(req.user.userId);
    sendResponse(res, {
      status: 200,
      success: true,
      user: profile,
    });
  } catch (err) {
    next(err);
  }
}
