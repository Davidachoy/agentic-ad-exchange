import { randomUUID } from "node:crypto";

import {
  AdFormatSchema,
  AdInventoryListingSchema,
  AdSizeSchema,
  AdTypeSchema,
  UsdcAmountSchema,
} from "@ade/shared";
import { z } from "zod";

import type { AgentTool } from "./types.js";

/**
 * LLM-facing input — only the creative fields the agent should choose.
 * Identity fields (listingId, sellerAgentId, sellerWallet, createdAt) are
 * injected by the tool from deps so the LLM cannot hallucinate them.
 */
const ListInventoryInputSchema = z.object({
  adType: AdTypeSchema,
  format: AdFormatSchema,
  size: AdSizeSchema,
  contextualExclusions: z.array(z.string()).default([]),
  floorPriceUsdc: UsdcAmountSchema,
});

const OutputSchema = z.object({ listingId: z.string().uuid(), accepted: z.boolean() });

export interface ListInventoryDeps {
  exchangeUrl: string;
  sellerAgentId: string;
  sellerWallet: string;
  fetchImpl?: typeof fetch;
  randomUuidImpl?: () => string;
  nowImpl?: () => Date;
}

export function createListInventoryTool(
  deps: ListInventoryDeps,
): AgentTool<z.infer<typeof ListInventoryInputSchema>, z.infer<typeof OutputSchema>> {
  const fetcher = deps.fetchImpl ?? fetch;
  const uuid = deps.randomUuidImpl ?? randomUUID;
  const now = deps.nowImpl ?? (() => new Date());
  return {
    name: "listInventory",
    description:
      "Register an ad inventory listing with the Exchange. Provide the ad type, format, size, floor price, and any contextual exclusions. Use when you have a new impression to sell.",
    inputSchema: ListInventoryInputSchema,
    outputSchema: OutputSchema,
    async invoke(input) {
      const listing = AdInventoryListingSchema.parse({
        ...input,
        listingId: uuid(),
        sellerAgentId: deps.sellerAgentId,
        sellerWallet: deps.sellerWallet,
        createdAt: now().toISOString(),
      });
      const res = await fetcher(`${deps.exchangeUrl}/inventory`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(listing),
      });
      return OutputSchema.parse({
        listingId: listing.listingId,
        accepted: res.status === 201,
      });
    },
  };
}
