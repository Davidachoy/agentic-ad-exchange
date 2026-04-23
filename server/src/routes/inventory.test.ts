import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";

const wallet = (s: string) => `0x${s.padStart(40, "0")}`;
const uuid = "11111111-1111-4111-8111-111111111111";

const validListing = {
  listingId: uuid,
  sellerAgentId: "seller-1",
  sellerWallet: wallet("1"),
  adType: "display",
  format: "banner",
  size: "300x250",
  contextualExclusions: [],
  floorPriceUsdc: "0.001",
  createdAt: "2026-04-22T12:00:00Z",
};

describe("POST /inventory", () => {
  it("accepts a valid listing (happy)", async () => {
    const { app } = createApp({
      corsAllowOrigins: ["http://localhost:5173"],
      bidRateLimitPerMin: 120,
    });
    const res = await request(app).post("/inventory").send(validListing);
    expect(res.status).toBe(201);
    expect(res.body.listingId).toBe(uuid);
  });

  it("lists submitted inventory (edge)", async () => {
    const { app } = createApp({
      corsAllowOrigins: ["http://localhost:5173"],
      bidRateLimitPerMin: 120,
    });
    await request(app).post("/inventory").send(validListing);
    const res = await request(app).get("/inventory");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it("400s on invalid wallet (failure)", async () => {
    const { app } = createApp({
      corsAllowOrigins: ["http://localhost:5173"],
      bidRateLimitPerMin: 120,
    });
    const res = await request(app)
      .post("/inventory")
      .send({ ...validListing, sellerWallet: "nope" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_failed");
  });
});
