import type { CircleClient } from "@ade/wallets";
import type { Logger } from "pino";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp, type AppHandles } from "../app.js";

const wallet = (s: string) => `0x${s.padStart(40, "0")}`;
const nonce = (s: string) => `0x${s.padStart(64, "0")}`;
const txHash = () => `0x${"a".repeat(64)}`;

const LISTING_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

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
  bidId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
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
      txHash: txHash(),
      state: "COMPLETE",
      blockchain: "ARC-TESTNET",
    }),
  };
}

function silentLogger(): Logger {
  // Reason: pino's surface is large but the auto-clear scheduler only calls
  // debug/info/error. A no-op partial cast keeps the test free of log spam.
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
  // Keep setImmediate/process.nextTick real so supertest's microtasks aren't
  // deadlocked. Only fake the timer functions the scheduler uses.
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => {
  handles?.autoClearScheduler.shutdown();
  handles = null;
  vi.useRealTimers();
});

describe("auto-clear lifecycle", () => {
  it("clears the auction without a manual button click after AUCTION_AUTO_CLEAR_DELAY_MS", async () => {
    handles = createApp({
      corsAllowOrigins: ["http://localhost:5173"],
      bidRateLimitPerMin: 120,
      circleClient: makeCircleClient(),
      buyerWalletId: "buyer-wallet-1",
      autoClearDelayMs: 1000,
      logger: silentLogger(),
    });

    const matched: unknown[] = [];
    const settled: unknown[] = [];
    handles.eventBus.on("auction.matched", (p) => matched.push(p));
    handles.eventBus.on("settlement.confirmed", (p) => settled.push(p));

    const inv = await request(handles.app).post("/inventory").send(validListing);
    expect(inv.status).toBe(201);

    const bid = await request(handles.app).post("/bid").send(validBid);
    expect(bid.status).toBe(202);

    // Sanity: nothing has fired yet — timer hasn't elapsed.
    expect(matched).toHaveLength(0);
    expect(settled).toHaveLength(0);

    // Fire the timer + drain the inner async work (Circle transfer + waitForTx).
    await vi.advanceTimersByTimeAsync(1000);
    await vi.runAllTicks();
    // One more microtask drain for the awaited mocked promises.
    await new Promise((r) => setImmediate(r));

    expect(matched).toHaveLength(1);
    expect(settled).toHaveLength(1);
    expect((matched[0] as { listingId: string }).listingId).toBe(LISTING_ID);

    // Listing was consumed on confirmed settlement.
    const after = await request(handles.app).get("/inventory");
    expect(after.body.items).toHaveLength(0);
  });
});
