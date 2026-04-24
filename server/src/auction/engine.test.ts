import type { BidRequest } from "@ade/shared";
import { describe, expect, it } from "vitest";

import { runSecondPriceAuction } from "./engine.js";

const wallet = (s: string) => `0x${s.padStart(40, "0")}`;
const nonce = (s: string) => `0x${s.padStart(64, "0")}`;

function makeBid(partial: Partial<BidRequest> & Pick<BidRequest, "bidId">): BidRequest {
  return {
    bidId: partial.bidId,
    buyerAgentId: partial.buyerAgentId ?? `buyer-${partial.bidId}`,
    buyerWallet: partial.buyerWallet ?? wallet(partial.bidId.replace(/-/g, "")),
    targeting: partial.targeting ?? {
      adType: "display",
      format: "banner",
      size: "300x250",
      contextTags: [],
    },
    bidAmountUsdc: partial.bidAmountUsdc ?? "0.001",
    budgetRemainingUsdc: partial.budgetRemainingUsdc ?? "1.000000",
    nonce: partial.nonce ?? nonce(partial.bidId.replace(/-/g, "")),
    createdAt: partial.createdAt ?? "2026-04-22T12:00:00Z",
  };
}

describe("runSecondPriceAuction", () => {
  it("returns null for empty input", () => {
    expect(runSecondPriceAuction({ bids: [], floorUsdc: "0.001" })).toBeNull();
  });

  it("returns null when every bid is below floor", () => {
    const result = runSecondPriceAuction({
      bids: [makeBid({ bidId: "a", bidAmountUsdc: "0.000500" })],
      floorUsdc: "0.001",
    });
    expect(result).toBeNull();
  });

  it("single-bidder: winner pays floor + tick, capped at their bid", () => {
    // floor 0.001 + tick 0.01 = 0.011 → capped at winner bid 0.005 = 0.005.
    const result = runSecondPriceAuction({
      bids: [makeBid({ bidId: "a", bidAmountUsdc: "0.005" })],
      floorUsdc: "0.001",
    });
    expect(result?.winner.bidId).toBe("a");
    expect(result?.clearingPriceUsdc).toBe("0.005000");
  });

  it("three bids: highest wins; clearing capped at winner bid (tick=0.01)", () => {
    const bids = [
      makeBid({ bidId: "a", bidAmountUsdc: "0.003" }),
      makeBid({ bidId: "b", bidAmountUsdc: "0.005" }),
      makeBid({ bidId: "c", bidAmountUsdc: "0.007" }),
    ];
    const result = runSecondPriceAuction({ bids, floorUsdc: "0.001" });
    // Second-price + tick = 0.005 + 0.01 = 0.015; capped at winner 0.007.
    expect(result?.winner.bidId).toBe("c");
    expect(result?.clearingPriceUsdc).toBe("0.007000");
  });

  it("tie-break: earliest createdAt wins when top bids are equal", () => {
    const bids = [
      makeBid({ bidId: "late", bidAmountUsdc: "0.008", createdAt: "2026-04-22T12:00:05Z" }),
      makeBid({ bidId: "early", bidAmountUsdc: "0.008", createdAt: "2026-04-22T12:00:00Z" }),
      makeBid({ bidId: "loser", bidAmountUsdc: "0.004" }),
    ];
    const result = runSecondPriceAuction({ bids, floorUsdc: "0.001" });
    expect(result?.winner.bidId).toBe("early");
  });

  it("floor enforcement: a below-floor bid is filtered before ranking", () => {
    const bids = [
      makeBid({ bidId: "low", bidAmountUsdc: "0.0005" }),
      makeBid({ bidId: "ok", bidAmountUsdc: "0.004" }),
    ];
    const result = runSecondPriceAuction({ bids, floorUsdc: "0.001" });
    expect(result?.winner.bidId).toBe("ok");
    expect(result?.rankedBids).toHaveLength(1);
  });

  it("caps clearing price at MAX_CLEARING_PRICE_USDC even when math exceeds it", () => {
    const bids = [
      makeBid({ bidId: "top", bidAmountUsdc: "0.050" }),
      makeBid({ bidId: "mid", bidAmountUsdc: "0.040" }),
    ];
    const result = runSecondPriceAuction({ bids, floorUsdc: "0.001" });
    // 0.040 + 0.01 = 0.050; capped at winner 0.050; then capped at $0.01 hackathon rule.
    expect(result?.clearingPriceUsdc).toBe("0.010000");
  });
});
