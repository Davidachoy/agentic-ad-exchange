import type { CircleClient } from "@ade/wallets";
import type { Logger } from "pino";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp, type AppHandles } from "../app.js";

const wallet = (s: string) => `0x${s.padStart(40, "0")}`;
const nonce = (s: string) => `0x${s.padStart(64, "0")}`;

const LISTING_ID = "11111111-1111-4111-8111-111111111100";

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
  bidId: "22222222-2222-4222-8222-222222222200",
  buyerAgentId: "buyer-1",
  buyerWallet: wallet("2"),
  targeting: { adType: "display", format: "banner", size: "300x250", contextTags: [] },
  bidAmountUsdc: "0.005000",
  budgetRemainingUsdc: "1.000000",
  nonce: nonce("b"),
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

function silentLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
  } as unknown as Logger;
}

let handles: AppHandles | null = null;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});
afterEach(() => {
  handles?.autoClearScheduler.shutdown();
  handles = null;
  vi.useRealTimers();
});

describe("auto-clear scheduler with pause", () => {
  it("does NOT settle when paused before the timer fires", async () => {
    handles = createApp({
      corsAllowOrigins: ["http://localhost:5173"],
      bidRateLimitPerMin: 120,
      circleClient: makeCircleClient(),
      buyerWalletId: "wallet-1",
      autoClearDelayMs: 1000,
      logger: silentLogger(),
    });

    const matched: unknown[] = [];
    const settled: unknown[] = [];
    handles.eventBus.on("auction.matched", (p) => matched.push(p));
    handles.eventBus.on("settlement.confirmed", (p) => settled.push(p));

    await request(handles.app).post("/inventory").send(validListing);
    await request(handles.app).post("/bid").send(validBid);

    // Pause AFTER the listing + bid are in but BEFORE the timer fires.
    handles.controlStore.setPaused(true);

    await vi.advanceTimersByTimeAsync(1000);
    await vi.runAllTicks();
    await new Promise((r) => setImmediate(r));

    // Auction did not run.
    expect(matched).toHaveLength(0);
    expect(settled).toHaveLength(0);
    // Listing still in inventory (would have been removed on confirmed settlement).
    const inv = await request(handles.app).get("/inventory");
    expect(inv.body.items).toHaveLength(1);
  });
});
