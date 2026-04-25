import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { CircleClient } from "@ade/wallets";

import { createApp } from "../app.js";

const wallet = (s: string) => `0x${s.padStart(40, "0")}`;
const nonce = (s: string) => `0x${s.padStart(64, "0")}`;
const txHash = () => `0x${"a".repeat(64)}`;

const LISTING_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BUYER_WALLET_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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

const makeBid = (i: number) => ({
  bidId: `${"0".repeat(8)}-0000-4000-8000-${i.toString().padStart(12, "0")}`,
  buyerAgentId: "buyer-1",
  buyerWallet: wallet("2"),
  targeting: { adType: "display", format: "banner", size: "300x250", contextTags: [] },
  bidAmountUsdc: "0.010000",
  budgetRemainingUsdc: "1.000000",
  nonce: nonce(i.toString(16)),
  createdAt: "2026-04-22T12:00:00Z",
});

function makeCircleClient(opts: { fail?: boolean } = {}): CircleClient {
  return {
    config: {} as never,
    createWalletSet: vi.fn(),
    createWallet: vi.fn(),
    getBalance: vi.fn(),
    listTransactions: vi.fn(),
    transfer: opts.fail
      ? vi.fn().mockRejectedValue(new Error("Circle transfer failed"))
      : vi.fn().mockResolvedValue({ transactionId: "tx-99", status: "confirmed" }),
    waitForTx: vi.fn().mockResolvedValue({
      transactionId: "tx-99",
      txHash: txHash(),
      state: "COMPLETE",
      blockchain: "ARC-TESTNET",
    }),
  };
}

function makeApp(circleClient: CircleClient | null = makeCircleClient()) {
  return createApp({
    corsAllowOrigins: ["http://localhost:5173"],
    bidRateLimitPerMin: 120,
    circleClient,
    buyerWalletId: BUYER_WALLET_ID,
  });
}

describe("POST /auction/run/:listingId", () => {
  it("runs second-price auction and returns confirmed receipt + emits both events (happy)", async () => {
    const emitted: string[] = [];
    const { app, eventBus } = makeApp();
    eventBus.on("auction.matched", () => emitted.push("auction.matched"));
    eventBus.on("settlement.confirmed", () => emitted.push("settlement.confirmed"));

    // Register listing and two bids so second-price math fires.
    await request(app).post("/inventory").send(validListing);
    await request(app).post("/bid").send(makeBid(1));
    await request(app)
      .post("/bid")
      .send({ ...makeBid(2), bidAmountUsdc: "0.005000", nonce: nonce("2") });

    const res = await request(app).post(`/auction/run/${LISTING_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.auctionResult.listingId).toBe(LISTING_ID);
    expect(res.body.auctionResult.clearingPriceUsdc).toBeDefined();
    expect(res.body.receipt.status).toBe("confirmed");
    expect(res.body.receipt.arcTxHash).toBe(txHash());
    expect(emitted).toEqual(["auction.matched", "settlement.confirmed"]);
  });

  it("returns 409 and does not settle when no bids clear the floor (edge)", async () => {
    const client = makeCircleClient();
    const { app } = makeApp(client);

    await request(app).post("/inventory").send(validListing);
    // Post a bid below the floor so it gets filtered out.
    await request(app)
      .post("/bid")
      .send({ ...makeBid(9), bidAmountUsdc: "0.000500", nonce: nonce("9") });

    const res = await request(app).post(`/auction/run/${LISTING_ID}`);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("no_eligible_bids");
    expect(client.transfer).not.toHaveBeenCalled();
  });

  it("stores a failed receipt and emits settlement.confirmed when Circle transfer throws (failure)", async () => {
    const emitted: string[] = [];
    const { app, eventBus, settlementStore } = makeApp(makeCircleClient({ fail: true }));
    eventBus.on("settlement.confirmed", () => emitted.push("settlement.confirmed"));

    await request(app).post("/inventory").send(validListing);
    await request(app).post("/bid").send(makeBid(7));

    const res = await request(app).post(`/auction/run/${LISTING_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.receipt.status).toBe("failed");
    expect(emitted).toContain("settlement.confirmed");
    const stored = await settlementStore.list();
    expect(stored[0]?.status).toBe("failed");
  });
});
