import { STREAM_EVENTS } from "@ade/shared";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../app.js";

function makeApp() {
  return createApp({
    corsAllowOrigins: ["http://localhost:5173"],
    bidRateLimitPerMin: 120,
    circleClient: null,
  });
}

describe("control plane routes", () => {
  it("GET /control/state reports the current paused flag (happy)", async () => {
    const handles = makeApp();
    try {
      const res = await request(handles.app).get("/control/state");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ paused: false });
    } finally {
      handles.autoClearScheduler.shutdown();
    }
  });

  it("POST /control/pause flips the flag and emits control.changed (happy)", async () => {
    const handles = makeApp();
    const events: { paused: boolean }[] = [];
    handles.eventBus.on(STREAM_EVENTS.controlChanged, (p) => events.push(p));
    try {
      const res = await request(handles.app).post("/control/pause");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ paused: true });

      const after = await request(handles.app).get("/control/state");
      expect(after.body).toEqual({ paused: true });

      expect(events).toHaveLength(1);
      expect(events[0]?.paused).toBe(true);
    } finally {
      handles.autoClearScheduler.shutdown();
    }
  });

  it("POST /control/resume unsets the flag (edge)", async () => {
    const handles = makeApp();
    try {
      await request(handles.app).post("/control/pause");
      const res = await request(handles.app).post("/control/resume");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ paused: false });
    } finally {
      handles.autoClearScheduler.shutdown();
    }
  });

  it("repeated POST /control/pause is idempotent (no duplicate event) (edge)", async () => {
    const handles = makeApp();
    const events: { paused: boolean }[] = [];
    handles.eventBus.on(STREAM_EVENTS.controlChanged, (p) => events.push(p));
    try {
      await request(handles.app).post("/control/pause");
      await request(handles.app).post("/control/pause");
      expect(events).toHaveLength(1);
    } finally {
      handles.autoClearScheduler.shutdown();
    }
  });
});

// Reason: keeps `vi` in scope; some setups will warn about unused imports.
void vi;
