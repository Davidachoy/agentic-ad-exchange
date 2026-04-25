import { loadRootEnv } from "@ade/shared/env";
import { describe, expect, it, vi } from "vitest";

import { createSellerAgent } from "../agent.js";
import { SELLER_SYSTEM_PROMPT } from "../prompt.js";
import {
  createListInventoryTool,
  createServeAdTool,
  createViewHistoryTool,
} from "../tools/index.js";

import { createGeminiLlmAdapter } from "./gemini.js";

/**
 * Live smoke test — gated on a real `GEMINI_API_KEY`. Skips automatically when
 * the key is absent so `pnpm test` stays hermetic in CI. Exchange HTTP calls
 * are stubbed via `fetchImpl` so the only network hop is to Gemini.
 *
 * Run with: `pnpm --filter @ade/agent-seller test` (key comes from .env.local).
 */
loadRootEnv();

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const describeSmoke = apiKey ? describe : describe.skip;

describeSmoke("createGeminiLlmAdapter (live Gemini smoke, seller)", () => {
  it(
    "accepts the generated functionDeclarations and picks listInventory",
    async () => {
      const fetchImpl = vi.fn(
        async () =>
          new Response(
            JSON.stringify({ listingId: "11111111-1111-4111-8111-111111111111" }),
            { status: 201 },
          ),
      );

      const tools = [
        createListInventoryTool({ exchangeUrl: "http://localhost:4021", fetchImpl }),
        createServeAdTool({ exchangeUrl: "http://localhost:4021" }),
        createViewHistoryTool({ exchangeUrl: "http://localhost:4021" }),
      ];

      const llm = createGeminiLlmAdapter({
        apiKey: apiKey as string,
        model,
        tools,
      });

      const agent = createSellerAgent({ llm, tools, systemPrompt: SELLER_SYSTEM_PROMPT });

      const result = await agent.run(
        [
          "List a 300x250 display banner with floor 0.001 USDC.",
          "Use these values verbatim:",
          '- listingId: "11111111-1111-4111-8111-111111111111"',
          '- sellerAgentId: "seller-smoke"',
          '- sellerWallet: "0x0000000000000000000000000000000000000001"',
          '- adType: "display"',
          '- format: "banner"',
          '- size: "300x250"',
          "- contextualExclusions: []",
          '- floorPriceUsdc: "0.001"',
          '- createdAt: "2026-04-22T12:00:00Z"',
        ].join("\n"),
      );

      // eslint-disable-next-line no-console
      console.log("[gemini smoke seller]", {
        model,
        iterations: result.iterations,
        toolCalls: result.toolCalls,
        output: result.output,
      });

      expect(result.iterations).toBeGreaterThan(0);
      expect(result.toolCalls.length).toBeGreaterThan(0);
      expect(result.toolCalls).toContain("listInventory");
      expect(fetchImpl).toHaveBeenCalled();
    },
    60_000,
  );
});
