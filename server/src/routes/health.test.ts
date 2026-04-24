import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";

describe("GET /health", () => {
  it("returns {status:'ok'}", async () => {
    const { app } = createApp({
      corsAllowOrigins: ["http://localhost:5173"],
      bidRateLimitPerMin: 120,
    });
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
