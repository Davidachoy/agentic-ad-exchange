import { loadRootEnv } from "@ade/shared/env";
import { describe, expect, it, vi } from "vitest";

import { createBuyerAgent } from "../agent.js";
import { BUYER_SYSTEM_PROMPT } from "../prompt.js";
import {
  createCheckBalanceTool,
  createPlaceBidTool,
  createReviewAuctionTool,
} from "../tools/index.js";

import { createAimlApiLlmAdapter } from "./aimlapi.js";

/**
 * Live smoke test against AIMLAPI — gated on AIMLAPI_API_KEY. Exercises the
 * full buyer-agent loop (LLM picks tool → tool runs → LLM summarizes) with
 * Exchange HTTP calls stubbed so the only external hop is AIMLAPI.
 */
loadRootEnv();

const apiKey = process.env.AIMLAPI_API_KEY;
const model = process.env.AIMLAPI_MODEL ?? "google/gemini-2.0-flash";
const baseUrl = process.env.AIMLAPI_BASE_URL ?? "https://api.aimlapi.com/v1";

const describeSmoke = apiKey ? describe : describe.skip;

describeSmoke("createAimlApiLlmAdapter (live AIMLAPI smoke)", () => {
  it(
    "accepts the generated tool schemas and picks a tool",
    async () => {
      const fetchImpl = vi.fn(
        async () =>
          new Response(
            JSON.stringify({ bidId: "11111111-1111-4111-8111-111111111111" }),
            { status: 202 },
          ),
      );

      const tools = [
        createPlaceBidTool({ exchangeUrl: "http://localhost:4021", fetchImpl }),
        createCheckBalanceTool({ exchangeUrl: "http://localhost:4021" }),
        createReviewAuctionTool({ exchangeUrl: "http://localhost:4021" }),
      ];

      const llm = createAimlApiLlmAdapter({
        apiKey: apiKey as string,
        model,
        baseUrl,
        tools,
      });

      const agent = createBuyerAgent({ llm, tools, systemPrompt: BUYER_SYSTEM_PROMPT });

      const result = await agent.run(
        [
          "Place a bid of 0.005 USDC on a display banner 300x250 impression.",
          "Use these values verbatim:",
          '- bidId: "11111111-1111-4111-8111-111111111111"',
          '- buyerAgentId: "buyer-smoke"',
          '- buyerWallet: "0x0000000000000000000000000000000000000002"',
          '- targeting: { adType: "display", format: "banner", size: "300x250", contextTags: [] }',
          '- bidAmountUsdc: "0.005"',
          '- budgetRemainingUsdc: "1.000000"',
          '- nonce: "0x000000000000000000000000000000000000000000000000000000000000000a"',
          '- createdAt: "2026-04-22T12:00:00Z"',
        ].join("\n"),
      );

      // eslint-disable-next-line no-console
      console.log("[aimlapi smoke]", {
        model,
        iterations: result.iterations,
        toolCalls: result.toolCalls,
        output: result.output.slice(0, 200),
      });

      expect(result.iterations).toBeGreaterThan(0);
      expect(result.toolCalls.length).toBeGreaterThan(0);
      expect(result.toolCalls).toContain("placeBid");
      expect(fetchImpl).toHaveBeenCalled();
    },
    60_000,
  );
});
