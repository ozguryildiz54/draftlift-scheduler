"use strict";

/**
 * (EN) Centralized Error Handling Middleware.
 * Handles all errors that occur in Express routes and are caught with `next(error)`.
 * It prevents the server from crashing and reports the error in two distinct formats:
 * 1. To the User: A user-friendly, English JSON message.
 * 2. To the Developer: A detailed, Turkish log to the console.
 */
function centralErrorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  console.error("\n--- [MERKEZİ HATA YÖNETİCİSİ] ---");
  console.error(
    `[${new Date().toISOString()}] ${req.method} ${
      req.originalUrl
    } isteği sırasında hata oluştu.`
  );
  console.error("Hata Mesajı:", err.message);
  console.error("Hata Detayı (Stack):", err.stack || "Stack bilgisi yok.");
  console.error("--- [HATA SONU] ---\n");
  if (res.headersSent) {
    return next(err);
  }
  res.status(statusCode).json({
    ok: false,
    message:
      "An unexpected error occurred on the server. Please try again later.",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
}

module.exports = { centralErrorHandler };
