import type { SellerAgent } from "@ade/agent-seller";
import type {
  AssistantAuctionReceiptBlock,
  AssistantChatMessage,
  AssistantChatResponse,
  AssistantUiBlock,
  DashboardAssistantContext,
} from "@ade/shared";
import { AssistantAuctionReceiptBlockSchema } from "@ade/shared";

import type { AssistantReplyShape } from "../routes/assistant.js";

/**
 * Bridge the seller chat agent into the `/assistant/chat` reply contract.
 *
 * The agent owns the multi-turn loop and tool selection (AUTO mode); this
 * bridge does only two things:
 *   1. Frame the user turn with the composer mode (`[mode=run_auction] …`) so
 *      the chat-mode prompt's gating rules can fire.
 *   2. Project the most recent tool result into an `auction_receipt` UI block
 *      when the tool was `runAuction`. Other tools surface only as text.
 *
 * Server-authoritative invariants (CLAUDE.md § Blockchain & Payment Safety):
 *  - Never trust the agent for clearing price — pass through what the engine
 *    returned via the tool's already-parsed output schema.
 *  - Never echo `eip3009Nonce` / `gatewayContract` / `walletId` — the tool
 *    output schema already strips them; the block schema is the second net.
 */
export async function generateSellerChatAgentReply(
  agent: SellerAgent,
  messages: AssistantChatMessage[],
  _context: DashboardAssistantContext,
  shape: AssistantReplyShape,
): Promise<AssistantChatResponse> {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    throw new Error("sellerChatAgent: last message must be a user turn");
  }
  const mode = shape.mode ?? "ask";
  const framed = `[mode=${mode}] ${last.content}`;

  const result = await agent.run(framed);

  const block = projectAuctionReceipt(result.lastToolResult, result.output);
  const blocks: AssistantUiBlock[] | undefined = block ? [block] : undefined;

  return {
    reply: result.output.trim().length > 0 ? result.output : "(no reply)",
    blocks,
  };
}

interface SettledRunAuctionValue {
  kind: "settled";
  listingId: string;
  clearingPriceUsdc: string;
  status: "pending" | "confirmed" | "failed";
  arcTxHash?: string;
}

interface OutcomeOnlyValue {
  kind: "listing_not_found" | "no_eligible_bids";
  listingId: string;
}

type RunAuctionValue = SettledRunAuctionValue | OutcomeOnlyValue;

function projectAuctionReceipt(
  last: { name: string; value: unknown } | undefined,
  modelOutput: string,
): AssistantAuctionReceiptBlock | undefined {
  if (!last || last.name !== "runAuction") return undefined;
  const value = last.value as RunAuctionValue;

  if (value.kind === "settled") {
    // Map SettlementStatus → AssistantAuctionReceiptStatus.
    const status = value.status === "confirmed" ? "settled" : "failed";
    const marginNote = buildMarginNote(value.clearingPriceUsdc, modelOutput);
    return AssistantAuctionReceiptBlockSchema.parse({
      type: "auction_receipt",
      listingId: value.listingId,
      status,
      clearingPriceUsdc: value.clearingPriceUsdc,
      arcTxHash: value.arcTxHash,
      marginNote,
    });
  }

  return AssistantAuctionReceiptBlockSchema.parse({
    type: "auction_receipt",
    listingId: value.listingId,
    status: value.kind,
  });
}

/**
 * One-line "uneconomic on traditional rails" framing for the block subtitle.
 * Cites the actual clearing price so the operator sees what was settled — the
 * margin-explainer hackathon invariant (CLAUDE.md § Non-negotiable).
 */
function buildMarginNote(clearingPriceUsdc: string, _modelOutput: string): string {
  return `Settled at $${clearingPriceUsdc} USDC — uneconomic on traditional rails; Circle nanopayments on Arc batch sub-cent transfers.`;
}
