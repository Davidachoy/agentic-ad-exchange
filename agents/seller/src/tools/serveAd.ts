import { z } from "zod";

import type { AgentTool } from "./types.js";

const InputSchema = z.object({
  auctionId: z.string().uuid(),
  creativeId: z.string().min(1),
});
const OutputSchema = z.object({
  served: z.boolean(),
  servedAt: z.string().datetime({ offset: true }),
});

export interface ServeAdDeps {
  exchangeUrl: string;
  fetchImpl?: typeof fetch;
}

export function createServeAdTool(
  deps: ServeAdDeps,
): AgentTool<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>> {
  const fetcher = deps.fetchImpl ?? fetch;
  return {
    name: "serveAd",
    description:
      "Serve the creative for a won auction. Only call AFTER the Exchange reports settlement confirmed for the given auctionId.",
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
    async invoke(_input) {
      // TODO(post-scaffold): POST /auctions/:id/serve once the route lands.
      void fetcher;
      return OutputSchema.parse({
        served: true,
        servedAt: new Date().toISOString(),
      });
    },
  };
}
