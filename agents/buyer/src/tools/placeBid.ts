import { BidRequestSchema, type BidRequest } from "@ade/shared";
import { z } from "zod";

import type { AgentTool } from "./types.js";

const OutputSchema = z.object({
  bidId: z.string().uuid(),
  accepted: z.boolean(),
});

export interface PlaceBidDeps {
  exchangeUrl: string;
  /** Injectable fetch for tests. */
  fetchImpl?: typeof fetch;
}

export function createPlaceBidTool(
  deps: PlaceBidDeps,
): AgentTool<BidRequest, z.infer<typeof OutputSchema>> {
  const fetcher = deps.fetchImpl ?? fetch;
  return {
    name: "placeBid",
    description:
      "Submit a bid to the Exchange for an ad impression. Input is the full BidRequest object. Use when the agent has decided to compete for an impression.",
    inputSchema: BidRequestSchema,
    outputSchema: OutputSchema,
    async invoke(input) {
      const res = await fetcher(`${deps.exchangeUrl}/bid`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = (await res.json()) as unknown;
      if (res.status === 202) {
        return OutputSchema.parse({ bidId: (json as { bidId: string }).bidId, accepted: true });
      }
      return OutputSchema.parse({ bidId: input.bidId, accepted: false });
    },
  };
}
