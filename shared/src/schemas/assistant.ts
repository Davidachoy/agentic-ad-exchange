import { z } from "zod";

import { AuctionResultSchema } from "./auction.js";
import { SettlementReceiptSchema } from "./settlement.js";

/** One chat turn from the UI (no system role — server adds instructions). */
export const AssistantChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});
export type AssistantChatMessage = z.infer<typeof AssistantChatMessageSchema>;

export const DashboardListingSummarySchema = z.object({
  listingId: z.string().uuid(),
  floorPriceUsdc: z.string(),
  adType: z.string(),
  format: z.string(),
  sellerAgentId: z.string(),
});
export type DashboardListingSummary = z.infer<typeof DashboardListingSummarySchema>;

export const DashboardBidSummarySchema = z.object({
  bidId: z.string().uuid(),
  bidAmountUsdc: z.string(),
  buyerAgentId: z.string(),
  /** BidRequest has no listing id; format/size hint targeting. */
  format: z.string(),
  size: z.string(),
});
export type DashboardBidSummary = z.infer<typeof DashboardBidSummarySchema>;

/** Sanitized snapshot of exchange UI state for Atlas (no secrets). */
export const DashboardAssistantContextSchema = z.object({
  generatedAt: z.string().min(1),
  sseConnected: z.boolean(),
  demoPaused: z.boolean(),
  settlementCount: z.number().int().nonnegative(),
  listings: z.array(DashboardListingSummarySchema).max(30),
  bids: z.array(DashboardBidSummarySchema).max(60),
  recentAuctions: z.array(AuctionResultSchema).max(10),
  lastAuction: AuctionResultSchema.nullable(),
  lastReceipt: SettlementReceiptSchema.nullable(),
});
export type DashboardAssistantContext = z.infer<typeof DashboardAssistantContextSchema>;

export const AssistantChatRequestSchema = z.object({
  messages: z.array(AssistantChatMessageSchema).min(1).max(40),
  context: DashboardAssistantContextSchema,
});
export type AssistantChatRequest = z.infer<typeof AssistantChatRequestSchema>;

export const AssistantChatResponseSchema = z.object({
  reply: z.string(),
});
export type AssistantChatResponse = z.infer<typeof AssistantChatResponseSchema>;
