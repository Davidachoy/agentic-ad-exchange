import { describe, expect, it } from "vitest";

import {
  AdInventoryListingSchema,
  AuctionResultSchema,
  BidRequestSchema,
  SettlementReceiptSchema,
} from "./schemas/index.js";

const wallet = (suffix: string) => `0x${suffix.padStart(40, "0")}`;
const nonce = (suffix: string) => `0x${suffix.padStart(64, "0")}`;
const uuid = () => "11111111-1111-4111-8111-111111111111";

describe("AdInventoryListingSchema", () => {
  const base = {
    listingId: uuid(),
    sellerAgentId: "seller-1",
    sellerWallet: wallet("1"),
    adType: "display" as const,
    format: "banner",
    size: "300x250",
    contextualExclusions: [],
    floorPriceUsdc: "0.001",
    createdAt: "2026-04-22T12:00:00Z",
  };

  it("accepts a valid listing (happy path)", () => {
    expect(AdInventoryListingSchema.parse(base)).toMatchObject({ sellerAgentId: "seller-1" });
  });

  it("defaults contextualExclusions to [] when omitted (edge)", () => {
    const { contextualExclusions: _omit, ...rest } = base;
    expect(AdInventoryListingSchema.parse(rest).contextualExclusions).toEqual([]);
  });

  it("rejects malformed wallet (failure)", () => {
    expect(() => AdInventoryListingSchema.parse({ ...base, sellerWallet: "nope" })).toThrow();
  });
});

describe("BidRequestSchema", () => {
  const base = {
    bidId: uuid(),
    buyerAgentId: "buyer-1",
    buyerWallet: wallet("2"),
    targeting: { adType: "display" as const, format: "banner", size: "300x250", contextTags: [] },
    bidAmountUsdc: "0.005",
    budgetRemainingUsdc: "10.000000",
    nonce: nonce("a"),
    createdAt: "2026-04-22T12:00:00Z",
  };

  it("accepts a valid bid (happy path)", () => {
    expect(BidRequestSchema.parse(base).bidAmountUsdc).toBe("0.005");
  });

  it("accepts max-precision USDC amounts (edge)", () => {
    expect(BidRequestSchema.parse({ ...base, bidAmountUsdc: "0.000001" }).bidAmountUsdc).toBe(
      "0.000001",
    );
  });

  it("rejects a non-decimal bid amount (failure)", () => {
    expect(() => BidRequestSchema.parse({ ...base, bidAmountUsdc: "1e-3" })).toThrow();
  });
});

describe("AuctionResultSchema", () => {
  const base = {
    auctionId: uuid(),
    listingId: uuid(),
    winningBidId: uuid(),
    winnerBuyerAgentId: "buyer-1",
    winnerBuyerWallet: wallet("2"),
    sellerAgentId: "seller-1",
    sellerWallet: wallet("1"),
    winningBidUsdc: "0.007",
    clearingPriceUsdc: "0.006",
    createdAt: "2026-04-22T12:00:00Z",
  };

  it("accepts a valid auction result (happy)", () => {
    expect(AuctionResultSchema.parse(base).clearingPriceUsdc).toBe("0.006");
  });

  it("rejects when wallets fail the regex (edge)", () => {
    expect(() => AuctionResultSchema.parse({ ...base, winnerBuyerWallet: "0x123" })).toThrow();
  });

  it("rejects invalid ISO datetime (failure)", () => {
    expect(() => AuctionResultSchema.parse({ ...base, createdAt: "yesterday" })).toThrow();
  });
});

describe("SettlementReceiptSchema", () => {
  const base = {
    receiptId: uuid(),
    auctionId: uuid(),
    buyerWallet: wallet("2"),
    sellerWallet: wallet("1"),
    gatewayContract: wallet("3"),
    amountUsdc: "0.006",
    eip3009Nonce: nonce("b"),
    status: "pending" as const,
    createdAt: "2026-04-22T12:00:00Z",
  };

  it("accepts pending receipt without arcTxHash (happy)", () => {
    expect(SettlementReceiptSchema.parse(base).status).toBe("pending");
  });

  it("accepts confirmed receipt with tx hash (edge)", () => {
    expect(
      SettlementReceiptSchema.parse({
        ...base,
        status: "confirmed",
        arcTxHash: nonce("c"),
        arcLogIndex: 0,
        confirmedAt: "2026-04-22T12:00:01Z",
      }).status,
    ).toBe("confirmed");
  });

  it("rejects a bad status (failure)", () => {
    expect(() => SettlementReceiptSchema.parse({ ...base, status: "queued" })).toThrow();
  });
});
