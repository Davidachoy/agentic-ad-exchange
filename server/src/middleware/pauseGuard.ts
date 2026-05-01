import type { RequestHandler } from "express";

import type { ControlStore } from "../state/controlStore.js";

/**
 * Express middleware that short-circuits write requests with a 409 when the
 * demo is paused. Read paths (`GET /inventory`, `GET /control/state`, SSE)
 * are intentionally NOT gated so the UI can still render and the agents can
 * still observe the pause state.
 */
export function createPauseGuard(controlStore: ControlStore): RequestHandler {
  return (_req, res, next) => {
    if (controlStore.isPaused()) {
      res.status(409).json({ error: "paused" });
      return;
    }
    next();
  };
}
