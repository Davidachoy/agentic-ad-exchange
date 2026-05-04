import {
  type AdInventoryListing,
  type AssistantUiBlock,
  type AuctionResult,
  type BidRequest,
  DashboardAssistantContextSchema,
  type DashboardAssistantContext,
  type SettlementReceipt,
} from "@ade/shared";

export interface BuildDashboardContextInput {
  sseConnected: boolean;
  demoPaused: boolean;
  settlementCount: number;
  listings: AdInventoryListing[];
  bids: BidRequest[];
  recentAuctions: AuctionResult[];
  lastAuction: AuctionResult | null;
  lastReceipt: SettlementReceipt | null;
}

export function buildDashboardAssistantContext(input: BuildDashboardContextInput): DashboardAssistantContext {
  return DashboardAssistantContextSchema.parse({
    generatedAt: new Date().toISOString(),
    sseConnected: input.sseConnected,
    demoPaused: input.demoPaused,
    settlementCount: input.settlementCount,
    listings: input.listings.map((l) => ({
      listingId: l.listingId,
      floorPriceUsdc: l.floorPriceUsdc,
      adType: l.adType,
      format: l.format,
      sellerAgentId: l.sellerAgentId,
    })),
    bids: input.bids.map((b) => ({
      bidId: b.bidId,
      bidAmountUsdc: b.bidAmountUsdc,
      buyerAgentId: b.buyerAgentId,
      format: b.targeting.format,
      size: b.targeting.size,
    })),
    recentAuctions: input.recentAuctions.slice(0, 10),
    lastAuction: input.lastAuction,
    lastReceipt: input.lastReceipt,
  });
}

/**
 * Deterministic copy when Gemini is unavailable (503) or network fails.
 */
/** Exchange-only metrics strip when Gemini is offline or the request fails. */
export function buildFallbackAssistantBlocks(ctx: DashboardAssistantContext): AssistantUiBlock[] {
  return [
    {
      type: "metrics_strip",
      items: [
        { label: "SSE", value: ctx.sseConnected ? "live" : "off", dataSource: "exchange" },
        { label: "Demo", value: ctx.demoPaused ? "paused" : "running", dataSource: "exchange" },
        { label: "Settlements", value: String(ctx.settlementCount), dataSource: "exchange" },
        { label: "Bids", value: String(ctx.bids.length), dataSource: "exchange" },
      ],
    },
  ];
}

export function buildFallbackAssistantSummary(ctx: DashboardAssistantContext): string {
  const lines: string[] = [
    "**Atlas (offline summary)** — Gemini is not configured or the assistant API failed. Here is a snapshot from your dashboard:",
    "",
    `- **SSE:** ${ctx.sseConnected ? "connected" : "disconnected"}`,
    `- **Demo:** ${ctx.demoPaused ? "paused" : "running"}`,
    `- **Confirmed settlements:** ${ctx.settlementCount}`,
    `- **Listings:** ${ctx.listings.length}`,
    `- **Open bids (buffer):** ${ctx.bids.length}`,
  ];
  if (ctx.lastAuction) {
    lines.push(
      "",
      "**Last auction**",
      `- Clearing: **${ctx.lastAuction.clearingPriceUsdc}** USDC · winner **${ctx.lastAuction.winnerBuyerAgentId}**`,
    );
  }
  if (ctx.lastReceipt) {
    lines.push(
      "",
      "**Last settlement receipt**",
      `- Status: **${ctx.lastReceipt.status}**${ctx.lastReceipt.arcTxHash ? ` · tx \`${ctx.lastReceipt.arcTxHash}\`` : ""}`,
    );
  }
  lines.push(
    "",
    "**Next steps:** register a listing on the Exchange page if empty, place bids, run an auction, then check the settlement ledger.",
  );
  return lines.join("\n");
}
