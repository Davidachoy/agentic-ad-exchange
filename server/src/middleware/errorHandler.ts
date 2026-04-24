import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { logger } from "../logger.js";

import { CorsRejectedError } from "./corsAllowList.js";

/**
 * JSON error handler. Never leaks internals in production — redacted in dev
 * by the logger's secret filter but stack traces are omitted from the response.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "validation_failed",
      issues: err.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
    return;
  }
  if (err instanceof CorsRejectedError) {
    res.status(403).json({ error: "cors_rejected", origin: err.origin });
    return;
  }
  logger.error({ err }, "unhandled_error");
  res.status(500).json({ error: "internal_error" });
};
