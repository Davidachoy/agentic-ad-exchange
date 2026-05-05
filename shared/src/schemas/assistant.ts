import { z } from "zod";

import { AuctionResultSchema } from "./auction.js";
import { IsoDateTimeSchema, UsdcAmountSchema } from "./primitives.js";
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

/** Role discriminator: lets the server pick the buyer vs seller system prompt. */
export const AssistantChatRoleSchema = z.enum(["buyer", "seller"]);
export type AssistantChatRole = z.infer<typeof AssistantChatRoleSchema>;

export const AssistantChatRequestSchema = z.object({
  messages: z.array(AssistantChatMessageSchema).min(1).max(40),
  context: DashboardAssistantContextSchema,
  /** Defaults to "buyer" so existing buyer clients keep working without sending the field. */
  role: AssistantChatRoleSchema.default("buyer"),
  /** Composer mode hint (e.g. "ask", "set_floor"). Server-side prompt may use this for shaping. */
  mode: z.string().min(1).max(40).optional(),
});
export type AssistantChatRequest = z.infer<typeof AssistantChatRequestSchema>;

/** Metric row in a dashboard-style strip (exchange snapshot vs demo simulation). */
export const AssistantMetricItemSchema = z.object({
  label: z.string().min(1).max(40),
  value: z.string().min(1).max(72),
  dataSource: z.enum(["exchange", "simulated"]),
});
export type AssistantMetricItem = z.infer<typeof AssistantMetricItemSchema>;

export const AssistantMetricsStripBlockSchema = z.object({
  type: z.literal("metrics_strip"),
  items: z.array(AssistantMetricItemSchema).min(1).max(8),
});
export type AssistantMetricsStripBlock = z.infer<typeof AssistantMetricsStripBlockSchema>;

export const AssistantPillSchema = z.object({
  text: z.string().min(1).max(120),
  variant: z.enum(["new", "kept", "neutral"]),
});
export type AssistantPill = z.infer<typeof AssistantPillSchema>;

export const AssistantPillGroupBlockSchema = z.object({
  type: z.literal("pill_group"),
  sectionTitle: z.string().min(1).max(32),
  pills: z.array(AssistantPillSchema).min(1).max(24),
});
export type AssistantPillGroupBlock = z.infer<typeof AssistantPillGroupBlockSchema>;

export const AssistantRejectedAlternativeSchema = z.object({
  action: z.string().min(1).max(200),
  reason: z.string().min(1).max(240),
});
export type AssistantRejectedAlternative = z.infer<typeof AssistantRejectedAlternativeSchema>;

export const AssistantDecisionBlockSchema = z.object({
  type: z.literal("decision"),
  headline: z.string().min(1).max(160),
  summary: z.string().min(1).max(600),
  reasoning: z.array(z.string().min(1).max(420)).max(10),
  rejected: z.array(AssistantRejectedAlternativeSchema).max(8),
  complianceNote: z.string().min(1).max(300).optional(),
  badge: z.string().min(1).max(48).optional(),
});
export type AssistantDecisionBlock = z.infer<typeof AssistantDecisionBlockSchema>;

/** One bar in a simple categorical bar chart (values are unitless counts or relative amounts for the demo). */
export const AssistantChartPointSchema = z.object({
  label: z.string().min(1).max(40),
  // Reason: Gemini often emits USDC amounts as JSON strings; strict z.number() dropped the whole bar_chart block.
  value: z.coerce.number().finite().nonnegative(),
});
export type AssistantChartPoint = z.infer<typeof AssistantChartPointSchema>;

export const AssistantBarChartBlockSchema = z.object({
  type: z.literal("bar_chart"),
  title: z.string().min(1).max(100),
  subtitle: z.string().min(1).max(200).optional(),
  /** Short axis hint shown near values (e.g. "USDC", "count"). */
  yCaption: z.string().min(1).max(24).optional(),
  points: z.array(AssistantChartPointSchema).min(1).max(14),
  dataSource: z.enum(["exchange", "simulated"]).default("exchange"),
});
export type AssistantBarChartBlock = z.infer<typeof AssistantBarChartBlockSchema>;

/**
 * Outcome status for a chat-driven auction action. Mirrors the discriminated
 * union returned by the seller agent's `runAuction` tool — `settled` carries
 * a clearing price and an Arc tx hash; `listing_not_found` / `no_eligible_bids`
 * are surfaced so the chat can frame the next step; `failed` covers Circle
 * settlement errors. Distinct from `SettlementStatus` ("confirmed" et al.) on
 * purpose — that enum is server-internal and would mislead operators here.
 */
export const AssistantAuctionReceiptStatusSchema = z.enum([
  "settled",
  "listing_not_found",
  "no_eligible_bids",
  "failed",
]);
export type AssistantAuctionReceiptStatus = z.infer<typeof AssistantAuctionReceiptStatusSchema>;

export const AssistantAuctionReceiptBlockSchema = z.object({
  type: z.literal("auction_receipt"),
  listingId: z.string().uuid(),
  /** Floor the seller submitted — optional because some outcomes do not echo it back. */
  floorPriceUsdc: UsdcAmountSchema.optional(),
  /** Wall-clock auto-clear deadline (when known) so the chat can show "closes at HH:MM". */
  autoClearAtIso: IsoDateTimeSchema.optional(),
  /** Server-computed clearing price. Absent for non-settled outcomes. */
  clearingPriceUsdc: UsdcAmountSchema.optional(),
  status: AssistantAuctionReceiptStatusSchema,
  /** Arc transaction hash from the Circle DCW transfer when status === "settled". */
  arcTxHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/)
    .optional(),
  /** One-line "uneconomic on traditional rails" framing rendered as block subtitle. */
  marginNote: z.string().min(1).max(200).optional(),
});
export type AssistantAuctionReceiptBlock = z.infer<typeof AssistantAuctionReceiptBlockSchema>;

export const AssistantUiBlockSchema = z.discriminatedUnion("type", [
  AssistantMetricsStripBlockSchema,
  AssistantPillGroupBlockSchema,
  AssistantDecisionBlockSchema,
  AssistantBarChartBlockSchema,
  AssistantAuctionReceiptBlockSchema,
]);
export type AssistantUiBlock = z.infer<typeof AssistantUiBlockSchema>;

export const AssistantChatResponseSchema = z.object({
  reply: z.string(),
  blocks: z.array(AssistantUiBlockSchema).max(5).optional(),
});
export type AssistantChatResponse = z.infer<typeof AssistantChatResponseSchema>;

const AssistantChatResponseLooseSchema = z.object({
  reply: z.coerce.string(),
  blocks: z.array(z.unknown()).max(8).optional(),
});

/**
 * Parse model JSON tolerantly: keep `reply`, accept up to 5 valid blocks and drop invalid entries.
 */
export function parseAssistantChatResponse(input: unknown): AssistantChatResponse {
  const root = AssistantChatResponseLooseSchema.safeParse(input);
  if (!root.success) {
    return { reply: "" };
  }
  const blocks: AssistantUiBlock[] = [];
  for (const raw of root.data.blocks ?? []) {
    const r = AssistantUiBlockSchema.safeParse(raw);
    if (r.success && blocks.length < 5) {
      blocks.push(r.data);
    }
  }
  const reply = root.data.reply.trim();
  return {
    reply: reply.length > 0 ? reply : "",
    blocks: blocks.length > 0 ? blocks : undefined,
  };
}
