import { describe, expect, it, vi } from "vitest";

import { createRunAuctionTool } from "./runAuction.js";

const LISTING_ID = "11111111-1111-4111-8111-111111111111";
const ARC_TX_HASH = `0x${"a".repeat(64)}`;
const NONCE = `0x${"b".repeat(64)}`;
const WALLET = `0x${"3".padStart(40, "0")}`;
const GATEWAY = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9";

const SETTLED_BODY = {
  auctionResult: {
    auctionId: "22222222-2222-4222-8222-222222222222",
    listingId: LISTING_ID,
    winningBidId: "33333333-3333-4333-8333-333333333333",
    winnerBuyerAgentId: "buyer-1",
    winnerBuyerWallet: `0x${"2".padStart(40, "0")}`,
    sellerAgentId: "seller-1",
    sellerWallet: WALLET,
    winningBidUsdc: "0.005",
    clearingPriceUsdc: "0.002",
    createdAt: "2026-04-22T12:00:00Z",
  },
  receipt: {
    receiptId: "44444444-4444-4444-8444-444444444444",
    auctionId: "22222222-2222-4222-8222-222222222222",
    buyerWallet: `0x${"2".padStart(40, "0")}`,
    sellerWallet: WALLET,
    gatewayContract: GATEWAY,
    amountUsdc: "0.002",
    eip3009Nonce: NONCE,
    status: "confirmed",
    arcTxHash: ARC_TX_HASH,
    createdAt: "2026-04-22T12:00:00Z",
    confirmedAt: "2026-04-22T12:00:01Z",
  },
};

describe("createRunAuctionTool", () => {
  it("returns settled outcome stripped of secrets and POSTs to /auction/run/:listingId (happy)", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify(SETTLED_BODY), { status: 200 }),
    );
    const tool = createRunAuctionTool({
      exchangeUrl: "http://exchange",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await tool.invoke({ listingId: LISTING_ID });

    expect(result).toEqual({
      kind: "settled",
      listingId: LISTING_ID,
      clearingPriceUsdc: "0.002",
      status: "confirmed",
      arcTxHash: ARC_TX_HASH,
    });
    // Secret-leak pin: explicit deny-list. Tool output must never include any of these.
    const keys = Object.keys(result as Record<string, unknown>);
    for (const banned of [
      "eip3009Nonce",
      "gatewayContract",
      "walletId",
      "nonce",
      "auctionResult",
      "receipt",
    ]) {
      expect(keys).not.toContain(banned);
    }

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(`http://exchange/auction/run/${LISTING_ID}`);
    expect((init as RequestInit).method).toBe("POST");
  });

  it("returns no_eligible_bids on a 409 response without throwing (edge)", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ error: "no_eligible_bids" }), { status: 409 }),
    );
    const tool = createRunAuctionTool({
      exchangeUrl: "http://exchange",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await tool.invoke({ listingId: LISTING_ID });
    expect(result).toEqual({ kind: "no_eligible_bids", listingId: LISTING_ID });
  });

  it("returns listing_not_found on a 404 response (failure)", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ error: "listing_not_found" }), { status: 404 }),
    );
    const tool = createRunAuctionTool({
      exchangeUrl: "http://exchange",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await tool.invoke({ listingId: LISTING_ID });
    expect(result).toEqual({ kind: "listing_not_found", listingId: LISTING_ID });
  });
});
