const globalErrorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.status || 500;
  let message = err.message || "Something went wrong";

  // 🔴 Postgres unique violation (extra safety)
  if (err.code === "23505") {
    statusCode = 409;

    if (err.constraint?.includes("email")) {
      message = "Email already exists.";
    } else if (err.constraint?.includes("phone")) {
      message = "Phone number already exists.";
    } else {
      message = "Duplicate value violates unique constraint.";
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
    // optional (only in dev)
    error:
      process.env.NODE_ENV === "development"
        ? err.detail || err.message
        : undefined,
  });
};

export default globalErrorHandler;
