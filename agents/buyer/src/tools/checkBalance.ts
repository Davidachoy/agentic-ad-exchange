import { z } from "zod";

import type { AgentTool } from "./types.js";

const InputSchema = z.object({ walletId: z.string().min(1) });
const OutputSchema = z.object({
  walletId: z.string().min(1),
  usdc: z.string().regex(/^\d+(?:\.\d{1,6})?$/),
  asOf: z.string().datetime({ offset: true }),
});

export interface CheckBalanceDeps {
  exchangeUrl: string;
  fetchImpl?: typeof fetch;
}

export function createCheckBalanceTool(
  deps: CheckBalanceDeps,
): AgentTool<z.infer<typeof InputSchema>, z.infer<typeof OutputSchema>> {
  const fetcher = deps.fetchImpl ?? fetch;
  return {
    name: "checkBalance",
    description:
      "Read the buyer wallet's on-chain USDC balance via the Exchange. Call before placing a bid so budget math uses fresh data.",
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
    async invoke(input) {
      // TODO(post-scaffold): wire a real /wallets/:id/balance endpoint.
      // Scaffold returns a deterministic shape so the agent loop + tests run.
      void fetcher;
      return OutputSchema.parse({
        walletId: input.walletId,
        usdc: "0.100000",
        asOf: new Date().toISOString(),
      });
    },
  };
}
