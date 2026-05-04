import { AuctionResultSchema, BidRequestSchema } from "@ade/shared";
import { describe, expect, it } from "vitest";

import {
  buildFixtureAuctionReplay,
  buildFixtureBids,
  buildFixtureListings,
  buildFixtureReceipts,
} from "./devUiSeed.js";

describe("devUiSeed fixtures", () => {
  it("builds listings that parse (happy)", () => {
    for (const L of buildFixtureListings()) {
      expect(L.listingId).toMatch(/^[0-9a-f-]{36}$/i);
      expect(L.floorPriceUsdc).toMatch(/^\d+\.\d+$/);
    }
  });

  it("builds bids that satisfy BidRequestSchema", () => {
    for (const b of buildFixtureBids()) {
      const p = BidRequestSchema.safeParse(b);
      expect(p.success, p.success ? "" : JSON.stringify(p.error.flatten())).toBe(true);
    }
  });

  it("builds auction replay that satisfies AuctionResultSchema", () => {
    for (const a of buildFixtureAuctionReplay()) {
      const p = AuctionResultSchema.safeParse(a);
      expect(p.success, p.success ? "" : JSON.stringify(p.error.flatten())).toBe(true);
    }
  });

  it("builds receipts aligned with auctions", () => {
    const auctions = buildFixtureAuctionReplay();
    const receipts = buildFixtureReceipts(auctions);
    expect(receipts.length).toBe(auctions.length);
    expect(receipts[0]?.auctionId).toBe(auctions[0]?.auctionId);
  });
});
