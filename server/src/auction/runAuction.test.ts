import type { CircleClient } from "@ade/wallets";
import { describe, expect, it, vi } from "vitest";

import { createEventBus } from "../events/bus.js";
import {
  createBidStore,
  createListingStore,
  createSettlementStore,
} from "../state/stores.js";

import { runAuction, type RunAuctionDeps } from "./runAuction.js";

const wallet = (s: string) => `0x${s.padStart(40, "0")}`;
const nonce = (s: string) => `0x${s.padStart(64, "0")}`;
const txHash = () => `0x${"a".repeat(64)}`;

const LISTING_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BUYER_WALLET_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const sampleListing = {
  listingId: LISTING_ID,
  sellerAgentId: "seller-1",
  sellerWallet: wallet("3"),
  adType: "display" as const,
  format: "banner",
  size: "300x250",
  contextualExclusions: [],
  floorPriceUsdc: "0.001",
  createdAt: "2026-04-22T12:00:00Z",
};

const makeBid = (i: number, amount = "0.010000") => ({
  bidId: `${"0".repeat(8)}-0000-4000-8000-${i.toString().padStart(12, "0")}`,
  buyerAgentId: "buyer-1",
  buyerWallet: wallet("2"),
  targeting: {
    adType: "display" as const,
    format: "banner",
    size: "300x250",
    contextTags: [],
  },
  bidAmountUsdc: amount,
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

async function buildDeps(opts: { circleFails?: boolean } = {}): Promise<{
  deps: RunAuctionDeps;
  emitted: string[];
}> {
  const listingStore = createListingStore();
  const bidStore = createBidStore();
  const settlementStore = createSettlementStore();
  const eventBus = createEventBus();
  const emitted: string[] = [];
  eventBus.on("auction.matched", () => emitted.push("auction.matched"));
  eventBus.on("settlement.confirmed", () => emitted.push("settlement.confirmed"));

  return {
    deps: {
      listingStore,
      bidStore,
      settlementStore,
      eventBus,
      circleClient: makeCircleClient({ fail: opts.circleFails }),
      buyerWalletId: BUYER_WALLET_ID,
    },
    emitted,
  };
}

describe("runAuction", () => {
  it("settles, removes the listing, and emits both events (happy)", async () => {
    const { deps, emitted } = await buildDeps();
    await deps.listingStore.add(sampleListing);
    await deps.bidStore.add(makeBid(1, "0.010000"));
    await deps.bidStore.add(makeBid(2, "0.005000"));

    const out = await runAuction(LISTING_ID, deps);

    expect(out.kind).toBe("settled");
    if (out.kind !== "settled") throw new Error("unreachable");
    expect(out.auctionResult.listingId).toBe(LISTING_ID);
    expect(out.receipt.status).toBe("confirmed");
    expect(out.receipt.arcTxHash).toBe(txHash());

    // Listing consumed on confirmed settlement.
    expect(await deps.listingStore.list()).toHaveLength(0);
    // Receipt persisted.
    expect(await deps.settlementStore.list()).toHaveLength(1);
    // Both lifecycle events fired in order.
    expect(emitted).toEqual(["auction.matched", "settlement.confirmed"]);
  });

  it("returns listing_not_found and emits nothing when the listing is missing (edge)", async () => {
    const { deps, emitted } = await buildDeps();

    const out = await runAuction("missing-id", deps);

    expect(out.kind).toBe("listing_not_found");
    expect(emitted).toHaveLength(0);
    expect(await deps.settlementStore.list()).toHaveLength(0);
  });

  it("stores a failed receipt and leaves the listing in place when Circle transfer rejects (failure)", async () => {
    const { deps, emitted } = await buildDeps({ circleFails: true });
    await deps.listingStore.add(sampleListing);
    await deps.bidStore.add(makeBid(7));

    const out = await runAuction(LISTING_ID, deps);

    expect(out.kind).toBe("settled");
    if (out.kind !== "settled") throw new Error("unreachable");
    expect(out.receipt.status).toBe("failed");

    // Failed settlement leaves the listing for re-auction.
    expect(await deps.listingStore.list()).toHaveLength(1);
    // Receipt still stored, both events still fire.
    expect(await deps.settlementStore.list()).toHaveLength(1);
    expect(emitted).toEqual(["auction.matched", "settlement.confirmed"]);
  });
});
