import type { AdInventoryListing, BidRequest } from "@ade/shared";
import { describe, expect, it } from "vitest";

import { matchBidsToListing } from "./match.js";

const wallet = (s: string) => `0x${s.padStart(40, "0")}`;
const nonce = (s: string) => `0x${s.padStart(64, "0")}`;

const listing: AdInventoryListing = {
  listingId: "11111111-1111-4111-8111-111111111111",
  sellerAgentId: "seller-1",
  sellerWallet: wallet("1"),
  adType: "display",
  format: "banner",
  size: "300x250",
  contextualExclusions: ["gambling"],
  floorPriceUsdc: "0.001",
  createdAt: "2026-04-22T12:00:00Z",
};

function bid(id: string, overrides: Partial<BidRequest> = {}): BidRequest {
  return {
    bidId: `11111111-1111-4111-8111-${id.padStart(12, "0")}`,
    buyerAgentId: `buyer-${id}`,
    buyerWallet: wallet(id),
    targeting: {
      adType: "display",
      format: "banner",
      size: "300x250",
      contextTags: [],
    },
    bidAmountUsdc: "0.005",
    budgetRemainingUsdc: "1.000000",
    nonce: nonce(id),
    createdAt: "2026-04-22T12:00:00Z",
    ...overrides,
  };
}

describe("matchBidsToListing", () => {
  it("matches compatible bids (happy path)", () => {
    const matched = matchBidsToListing(listing, [bid("a"), bid("b")]);
    expect(matched).toHaveLength(2);
  });

  it("filters bids with mismatched size (edge)", () => {
    const odd = bid("c", {
      targeting: { adType: "display", format: "banner", size: "728x90", contextTags: [] },
    });
    const matched = matchBidsToListing(listing, [bid("a"), odd]);
    expect(matched.map((b) => b.bidId)).not.toContain(odd.bidId);
  });

  it("rejects bids whose context tag hits a contextual exclusion (failure)", () => {
    const blocked = bid("d", {
      targeting: {
        adType: "display",
        format: "banner",
        size: "300x250",
        contextTags: ["gambling"],
      },
    });
    const matched = matchBidsToListing(listing, [blocked]);
    expect(matched).toHaveLength(0);
  });
});
