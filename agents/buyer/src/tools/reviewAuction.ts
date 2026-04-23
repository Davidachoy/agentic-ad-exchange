import { AuctionResultSchema } from "@ade/shared";
import { z } from "zod";

import type { AgentTool } from "./types.js";

const InputSchema = z.object({ auctionId: z.string().uuid() });

export interface ReviewAuctionDeps {
  exchangeUrl: string;
  fetchImpl?: typeof fetch;
}

export function createReviewAuctionTool(
  deps: ReviewAuctionDeps,
): AgentTool<z.infer<typeof InputSchema>, z.infer<typeof AuctionResultSchema>> {
  const fetcher = deps.fetchImpl ?? fetch;
  return {
    name: "reviewAuction",
    description:
      "Fetch a prior auction result from the Exchange. Use to confirm win/loss, clearing price, and seller for a given auctionId.",
    inputSchema: InputSchema,
    outputSchema: AuctionResultSchema,
    async invoke(input) {
      const res = await fetcher(`${deps.exchangeUrl}/auctions/${input.auctionId}`, {
        method: "GET",
      });
      if (!res.ok) throw new Error(`reviewAuction: ${res.status}`);
      const json = (await res.json()) as unknown;
      return AuctionResultSchema.parse(json);
    },
  };
}
