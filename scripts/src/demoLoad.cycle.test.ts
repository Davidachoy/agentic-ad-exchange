import { describe, expect, it, vi } from "vitest";

import { pickBidAmount, runDemoCycle } from "./demoLoad.cycle.js";

const buyer = `0x${"1".repeat(40)}`;

const mockAuctionResponse = {
  auctionResult: {
    auctionId: "auction-123",
    clearingPriceUsdc: "0.005000",
  },
  receipt: {
    status: "COMPLETE",
    arcTxHash: `0x${"c".repeat(64)}`,
  },
};

describe("runDemoCycle", () => {
  it("settles one bid/auction/transfer cycle (happy path)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = url instanceof Request ? url.url : url.toString();
      if (urlStr.includes("/bid")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (urlStr.includes("/auction/run/")) {
        return new Response(JSON.stringify(mockAuctionResponse), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    });

    const result = await runDemoCycle({
      exchangeApiUrl: "http://localhost:3000",
      listingId: "listing-1",
      buyerAddress: buyer,
      floorUsdc: "0.001",
      rand: () => 0.5,
    });

    expect(result.status).toBe("COMPLETE");
    expect(result.txHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(result.explorerUrl).toContain("/tx/0x");
    expect(result.clearingPrice).toBe("0.005000");
    expect(result.auctionId).toBe("auction-123");
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    fetchSpy.mockRestore();
  });

  it("clamps bid to the $0.01 cap when rand returns 0 near the cap (edge)", () => {
    // floor + tick = 0.001 + 0.01 = 0.011, which exceeds MAX 0.01 — clamp to cap.
    expect(pickBidAmount("0.001", () => 0)).toBe("0.010000");
  });

  it("propagates auction/run failures (failure)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = url instanceof Request ? url.url : url.toString();
      if (urlStr.includes("/bid")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (urlStr.includes("/auction/run/")) {
        return new Response(JSON.stringify({ error: "FAILED" }), { status: 500 });
      }
      return new Response("not found", { status: 404 });
    });

    await expect(
      runDemoCycle({
        exchangeApiUrl: "http://localhost:3000",
        listingId: "listing-1",
        buyerAddress: buyer,
        floorUsdc: "0.001",
        rand: () => 0.3,
      }),
    ).rejects.toThrow(/failed: 500/);

    fetchSpy.mockRestore();
  });
});
