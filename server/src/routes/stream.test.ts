import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";

describe("GET /events (SSE)", () => {
  it("emits a `connected` event on subscribe (happy)", async () => {
    const { app } = createApp({
      corsAllowOrigins: ["http://localhost:5173"],
      bidRateLimitPerMin: 120,
    });
    // Supertest buffers the initial SSE payload; we only need to see the first event.
    const res = await request(app)
      .get("/events")
      .buffer(true)
      .parse((r, cb) => {
        let data = "";
        r.on("data", (chunk: Buffer) => {
          data += chunk.toString("utf-8");
          if (data.includes("event: connected")) r.destroy();
        });
        r.on("close", () => cb(null, data));
        r.on("error", (err) => cb(err, data));
      });
    expect(res.status).toBe(200);
    expect(String(res.body)).toContain("event: connected");
  });
});
