import type { CircleClient } from "@ade/wallets";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp, type AppHandles } from "../app.js";

const wallet = (s: string) => `0x${s.padStart(40, "0")}`;
const nonce = (s: string) => `0x${s.padStart(64, "0")}`;

const LISTING_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const validListing = {
  listingId: LISTING_ID,
  sellerAgentId: "seller-1",
  sellerWallet: wallet("3"),
  adType: "display",
  format: "banner",
  size: "300x250",
  contextualExclusions: [],
  floorPriceUsdc: "0.001",
  createdAt: "2026-04-22T12:00:00Z",
};

const validBid = {
  bidId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  buyerAgentId: "buyer-1",
  buyerWallet: wallet("2"),
  targeting: { adType: "display", format: "banner", size: "300x250", contextTags: [] },
  bidAmountUsdc: "0.005000",
  budgetRemainingUsdc: "1.000000",
  nonce: nonce("a"),
  createdAt: "2026-04-22T12:00:00Z",
};

function makeCircleClient(): CircleClient {
  return {
    config: {} as never,
    createWalletSet: vi.fn(),
    createWallet: vi.fn(),
    getBalance: vi.fn(),
    listTransactions: vi.fn(),
    transfer: vi.fn().mockResolvedValue({ transactionId: "tx-99", status: "confirmed" }),
    waitForTx: vi.fn().mockResolvedValue({
      transactionId: "tx-99",
      txHash: `0x${"a".repeat(64)}`,
      state: "COMPLETE",
      blockchain: "ARC-TESTNET",
    }),
  };
}

function makeApp(): AppHandles {
  return createApp({
    corsAllowOrigins: ["http://localhost:5173"],
    bidRateLimitPerMin: 120,
    circleClient: makeCircleClient(),
    buyerWalletId: "wallet-1",
  });
}

describe("pause guard", () => {
  it("rejects POST /bid with 409 when paused (happy)", async () => {
    const handles = makeApp();
    try {
      handles.controlStore.setPaused(true);
      const res = await request(handles.app).post("/bid").send(validBid);
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: "paused" });
      // Bid was NOT stored.
      expect(await handles.bidStore.list()).toHaveLength(0);
    } finally {
      handles.autoClearScheduler.shutdown();
    }
  });

  it("rejects POST /inventory with 409 when paused (edge)", async () => {
    const handles = makeApp();
    try {
      handles.controlStore.setPaused(true);
      const res = await request(handles.app).post("/inventory").send(validListing);
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: "paused" });
      expect(await handles.listingStore.list()).toHaveLength(0);
    } finally {
      handles.autoClearScheduler.shutdown();
    }
  });

  it("rejects POST /auction/run/:id with 409 when paused (edge)", async () => {
    const handles = makeApp();
    try {
      // Seed a listing while running so the route's not-found path doesn't mask the gate.
      await request(handles.app).post("/inventory").send(validListing);
      handles.controlStore.setPaused(true);

      const res = await request(handles.app).post(`/auction/run/${LISTING_ID}`);
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: "paused" });
    } finally {
      handles.autoClearScheduler.shutdown();
    }
  });

  it("read paths (GET /inventory, GET /control/state) still work when paused (edge)", async () => {
    const handles = makeApp();
    try {
      await request(handles.app).post("/inventory").send(validListing);
      handles.controlStore.setPaused(true);

      const inv = await request(handles.app).get("/inventory");
      expect(inv.status).toBe(200);
      expect(inv.body.items).toHaveLength(1);

      const ctrl = await request(handles.app).get("/control/state");
      expect(ctrl.status).toBe(200);
      expect(ctrl.body.paused).toBe(true);
    } finally {
      handles.autoClearScheduler.shutdown();
    }
  });

  it("resuming clears the gate (failure-recovery)", async () => {
    const handles = makeApp();
    try {
      handles.controlStore.setPaused(true);
      const blocked = await request(handles.app).post("/bid").send(validBid);
      expect(blocked.status).toBe(409);

      handles.controlStore.setPaused(false);
      const ok = await request(handles.app).post("/bid").send(validBid);
      expect(ok.status).toBe(202);
    } finally {
      handles.autoClearScheduler.shutdown();
    }
  });
});
