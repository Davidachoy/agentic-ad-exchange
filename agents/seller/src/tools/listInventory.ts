import { AdInventoryListingSchema, type AdInventoryListing } from "@ade/shared";
import { z } from "zod";

import type { AgentTool } from "./types.js";

const OutputSchema = z.object({ listingId: z.string().uuid(), accepted: z.boolean() });

export interface ListInventoryDeps {
  exchangeUrl: string;
  fetchImpl?: typeof fetch;
}

export function createListInventoryTool(
  deps: ListInventoryDeps,
): AgentTool<AdInventoryListing, z.infer<typeof OutputSchema>> {
  const fetcher = deps.fetchImpl ?? fetch;
  return {
    name: "listInventory",
    description:
      "Register an ad inventory listing with the Exchange (ad type, format, size, floor price, contextual exclusions). Use when you have a new impression to sell.",
    inputSchema: AdInventoryListingSchema,
    outputSchema: OutputSchema,
    async invoke(input) {
      const res = await fetcher(`${deps.exchangeUrl}/inventory`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = (await res.json()) as { listingId?: string };
      return OutputSchema.parse({
        listingId: json.listingId ?? input.listingId,
        accepted: res.status === 201,
      });
    },
  };
}
