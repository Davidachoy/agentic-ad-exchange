import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";

const baseDeps = {
  corsAllowOrigins: ["http://localhost:5173"],
  bidRateLimitPerMin: 120,
};

describe("POST /demo/agent-run gating by DEMO_MODE", () => {
  it("returns 503 demo_not_configured when mode=in_process and gemini is missing (happy: route is mounted)", async () => {
    const { app } = createApp({
      ...baseDeps,
      demo: {
        exchangeUrl: "http://localhost:4021",
        personas: [],
        // no gemini, no buyerPrivateKey
        mode: "in_process",
      },
    });
    const res = await request(app).post("/demo/agent-run");
    expect(res.status).toBe(503);
    expect(res.body.error).toBe("demo_not_configured");
  });

  it("returns 404 when mode=external (edge: demo router not mounted)", async () => {
    const { app } = createApp({
      ...baseDeps,
      demo: {
        exchangeUrl: "http://localhost:4021",
        personas: [],
        mode: "external",
      },
    });
    const res = await request(app).post("/demo/agent-run");
    expect(res.status).toBe(404);
  });

  it("returns 404 when demo deps are absent entirely (failure of registration)", async () => {
    const { app } = createApp(baseDeps);
    const res = await request(app).post("/demo/agent-run");
    expect(res.status).toBe(404);
  });
});
