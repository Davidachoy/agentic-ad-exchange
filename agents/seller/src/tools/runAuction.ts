import { SettlementStatusSchema, UsdcAmountSchema } from "@ade/shared";
import { z } from "zod";

import type { AgentTool } from "./types.js";

/**
 * LLM-facing input — only the listing the agent is closing. Identity / floor
 * are server-authoritative; the tool layer just routes the close request.
 */
const RunAuctionInputSchema = z.object({
  listingId: z.string().uuid(),
});

const SettledOutputSchema = z.object({
  kind: z.literal("settled"),
  listingId: z.string().uuid(),
  clearingPriceUsdc: UsdcAmountSchema,
  status: SettlementStatusSchema,
  arcTxHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/)
    .optional(),
});

const ListingNotFoundSchema = z.object({
  kind: z.literal("listing_not_found"),
  listingId: z.string().uuid(),
});

const NoEligibleBidsSchema = z.object({
  kind: z.literal("no_eligible_bids"),
  listingId: z.string().uuid(),
});

/**
 * Discriminated union so the agent can branch on outcome rather than parsing a
 * generic error string. CLAUDE.md § Security: this schema is the safety net for
 * stripping `eip3009Nonce`, `gatewayContract`, and `walletId` — but the tool
 * also explicitly projects only the safe fields below so secrets never reach
 * the LLM-facing surface even if the schema regresses.
 */
const RunAuctionOutputSchema = z.discriminatedUnion("kind", [
  SettledOutputSchema,
  ListingNotFoundSchema,
  NoEligibleBidsSchema,
]);

export type RunAuctionToolOutput = z.infer<typeof RunAuctionOutputSchema>;

export interface RunAuctionDeps {
  exchangeUrl: string;
  /** Injectable fetch for tests; production callers leave undefined. */
  fetchImpl?: typeof fetch;
}

interface SettledServerBody {
  auctionResult: { clearingPriceUsdc: string };
  receipt: { status: string; arcTxHash?: string };
}

export function createRunAuctionTool(
  deps: RunAuctionDeps,
): AgentTool<z.infer<typeof RunAuctionInputSchema>, RunAuctionToolOutput> {
  const fetcher = deps.fetchImpl ?? fetch;
  return {
    name: "runAuction",
    description:
      "Close an open ad listing by clearing its auction now. Cancels the auto-clear timer, runs the second-price auction, and triggers settlement. Provide the listingId returned by listInventory. Use ONLY when the operator explicitly says to close, settle, or run an auction; do not call this on read-only Q&A.",
    inputSchema: RunAuctionInputSchema,
    outputSchema: RunAuctionOutputSchema,
    async invoke(input) {
      const url = `${deps.exchangeUrl}/auction/run/${input.listingId}`;
      const res = await fetcher(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });

      if (res.status === 404) {
        return RunAuctionOutputSchema.parse({
          kind: "listing_not_found",
          listingId: input.listingId,
        });
      }
      if (res.status === 409) {
        return RunAuctionOutputSchema.parse({
          kind: "no_eligible_bids",
          listingId: input.listingId,
        });
      }

      const json = (await res.json()) as SettledServerBody;
      // Reason: explicit projection (NOT a spread) so eip3009Nonce, gatewayContract,
      // walletId, and any other server-internal fields cannot leak into LLM context.
      return RunAuctionOutputSchema.parse({
        kind: "settled",
        listingId: input.listingId,
        clearingPriceUsdc: json.auctionResult.clearingPriceUsdc,
        status: json.receipt.status,
        arcTxHash: json.receipt.arcTxHash,
      });
    },
  };
}
