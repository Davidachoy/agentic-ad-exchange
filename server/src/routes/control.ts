import { STREAM_EVENTS } from "@ade/shared";
import { Router } from "express";

import type { EventBus } from "../events/bus.js";
import type { ControlStore } from "../state/controlStore.js";

export interface ControlDeps {
  controlStore: ControlStore;
  eventBus: EventBus;
}

export function createControlRouter(deps: ControlDeps): Router {
  const router = Router();

  router.get("/control/state", (_req, res) => {
    res.json({ paused: deps.controlStore.isPaused() });
  });

  router.post("/control/pause", (_req, res) => {
    setAndMaybeEmit(deps, true);
    res.json({ paused: deps.controlStore.isPaused() });
  });

  router.post("/control/resume", (_req, res) => {
    setAndMaybeEmit(deps, false);
    res.json({ paused: deps.controlStore.isPaused() });
  });

  return router;
}

function setAndMaybeEmit(deps: ControlDeps, next: boolean): void {
  const before = deps.controlStore.isPaused();
  deps.controlStore.setPaused(next);
  // Reason: setPaused is itself idempotent (no-op when value unchanged), but
  // we only emit the SSE event on a real transition so the UI doesn't see
  // duplicate banners on repeated POSTs.
  if (before !== next) {
    deps.eventBus.emit(STREAM_EVENTS.controlChanged, {
      paused: next,
      at: new Date().toISOString(),
    });
  }
}
