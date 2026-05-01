import { loadRootEnv } from "@ade/shared/env";
import { describe, expect, it, vi } from "vitest";

import { createBuyerAgent } from "../agent.js";
import { BUYER_SYSTEM_PROMPT } from "../prompt.js";
import {
  createCheckBalanceTool,
  createPlaceBidTool,
  createReviewAuctionTool,
} from "../tools/index.js";

import { createGeminiLlmAdapter } from "./gemini.js";

/**
 * Live smoke test — gated on a real `GEMINI_API_KEY`. Skips automatically when
 * the key is absent so `pnpm test` stays hermetic in CI. Exchange HTTP calls
 * are stubbed via `fetchImpl` so the only network hop is to Gemini.
 *
 * Run with: `pnpm --filter @ade/agent-buyer test` (key comes from .env.local).
 */
loadRootEnv();

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const describeSmoke = apiKey ? describe : describe.skip;

describeSmoke("createGeminiLlmAdapter (live Gemini smoke)", () => {
  it(
    "accepts the generated functionDeclarations and picks a tool",
    async () => {
      const fetchImpl = vi.fn(
        async () =>
          new Response(
            JSON.stringify({ bidId: "11111111-1111-4111-8111-111111111111" }),
            { status: 202 },
          ),
      );

      const tools = [
        createPlaceBidTool({
          exchangeUrl: "http://localhost:4021",
          buyerAgentId: "buyer-smoke",
          buyerWallet: "0x0000000000000000000000000000000000000002",
          fetchImpl,
        }),
        createCheckBalanceTool({ exchangeUrl: "http://localhost:4021" }),
        createReviewAuctionTool({ exchangeUrl: "http://localhost:4021" }),
      ];

      const llm = createGeminiLlmAdapter({
        apiKey: apiKey as string,
        model,
        tools,
      });

      const agent = createBuyerAgent({ llm, tools, systemPrompt: BUYER_SYSTEM_PROMPT });

      const result = await agent.run(
        [
          "Place a bid of 0.005 USDC on a display banner 300x250 impression.",
          "Use these values:",
          '- targeting: { adType: "display", format: "banner", size: "300x250", contextTags: [] }',
          '- bidAmountUsdc: "0.005"',
          '- budgetRemainingUsdc: "1.000000"',
        ].join("\n"),
      );

      // eslint-disable-next-line no-console
      console.log("[gemini smoke]", {
        model,
        iterations: result.iterations,
        toolCalls: result.toolCalls,
        output: result.output,
      });

      expect(result.iterations).toBeGreaterThan(0);
      expect(result.toolCalls.length).toBeGreaterThan(0);
      // The agent should at least attempt the placeBid tool for this prompt.
      expect(result.toolCalls).toContain("placeBid");
      expect(fetchImpl).toHaveBeenCalled();
    },
    60_000,
  );
});
