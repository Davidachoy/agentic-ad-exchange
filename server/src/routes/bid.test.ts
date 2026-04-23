import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";

const wallet = (s: string) => `0x${s.padStart(40, "0")}`;
const nonce = (s: string) => `0x${s.padStart(64, "0")}`;

const validBid = {
  bidId: "22222222-2222-4222-8222-222222222222",
  buyerAgentId: "buyer-1",
  buyerWallet: wallet("2"),
  targeting: {
    adType: "display",
    format: "banner",
    size: "300x250",
    contextTags: [],
  },
  bidAmountUsdc: "0.005",
  budgetRemainingUsdc: "1.000000",
  nonce: nonce("a"),
  createdAt: "2026-04-22T12:00:00Z",
};

describe("POST /bid", () => {
  it("accepts a valid bid (happy)", async () => {
    const { app } = createApp({
      corsAllowOrigins: ["http://localhost:5173"],
      bidRateLimitPerMin: 120,
    });
    const res = await request(app).post("/bid").send(validBid);
    expect(res.status).toBe(202);
    expect(res.body.bidId).toBe(validBid.bidId);
  });

  it("409s when the same nonce is reused by the same wallet (edge)", async () => {
    const { app } = createApp({
      corsAllowOrigins: ["http://localhost:5173"],
      bidRateLimitPerMin: 120,
    });
    await request(app).post("/bid").send(validBid);
    const res = await request(app)
      .post("/bid")
      .send({ ...validBid, bidId: "33333333-3333-4333-8333-333333333333" });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("nonce_reused");
  });

  it("429s once per-wallet rate limit is exceeded (failure)", async () => {
    const { app } = createApp({
      corsAllowOrigins: ["http://localhost:5173"],
      bidRateLimitPerMin: 2,
    });
    // Distinct bidIds + nonces so we don't trip nonce reuse first.
    const mkBid = (i: number) => ({
      ...validBid,
      bidId: `${"0".repeat(8)}-0000-4000-8000-${i.toString().padStart(12, "0")}`,
      nonce: nonce(i.toString(16)),
    });
    const r1 = await request(app).post("/bid").send(mkBid(1));
    const r2 = await request(app).post("/bid").send(mkBid(2));
    const r3 = await request(app).post("/bid").send(mkBid(3));
    expect(r1.status).toBe(202);
    expect(r2.status).toBe(202);
    expect(r3.status).toBe(429);
  });
});
