// ─── middleware/auth.middleware.js ────────────────────────────────────────────
// Protects routes: verifies JWT, attaches req.user = { userId, profileId, email }

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret-in-production";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      profileId: decoded.profileId,
      email: decoded.email,
    };
    next();
  } catch (err) {
    const message =
      err.name === "TokenExpiredError"
        ? "Token expired. Please log in again."
        : "Invalid token.";
    return res.status(401).json({ success: false, message });
  }
}
