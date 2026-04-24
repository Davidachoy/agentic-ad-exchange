import { MAX_AGENT_ITERATIONS } from "@ade/shared";
import { describe, expect, it, vi } from "vitest";

import { createSellerAgent, type LlmAdapter } from "./agent.js";
import { SELLER_SYSTEM_PROMPT } from "./prompt.js";
import {
  createListInventoryTool,
  createServeAdTool,
  createViewHistoryTool,
} from "./tools/index.js";

function fakeLlm(decisions: ReturnType<LlmAdapter["step"]>[]): LlmAdapter {
  let i = 0;
  return {
    async step() {
      const d = decisions[i];
      i += 1;
      if (!d) throw new Error("llm ran out of scripted decisions");
      return d;
    },
  };
}

const wallet = (s: string) => `0x${s.padStart(40, "0")}`;

const listing = {
  listingId: "11111111-1111-4111-8111-111111111111",
  sellerAgentId: "seller-1",
  sellerWallet: wallet("1"),
  adType: "display" as const,
  format: "banner",
  size: "300x250",
  contextualExclusions: [],
  floorPriceUsdc: "0.001",
  createdAt: "2026-04-22T12:00:00Z",
};

describe("createSellerAgent", () => {
  it("selects listInventory for a listing instruction (happy)", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ listingId: listing.listingId }), { status: 201 }),
    );
    const tools = [
      createListInventoryTool({ exchangeUrl: "http://localhost:4021", fetchImpl }),
      createServeAdTool({ exchangeUrl: "http://localhost:4021" }),
      createViewHistoryTool({ exchangeUrl: "http://localhost:4021" }),
    ];
    const agent = createSellerAgent({
      llm: fakeLlm([
        Promise.resolve({ toolCall: { name: "listInventory", args: listing } }),
        Promise.resolve({ final: "Listed." }),
      ]),
      tools,
      systemPrompt: SELLER_SYSTEM_PROMPT,
    });
    const result = await agent.run("List 300x250 banner with floor 0.001");
    expect(result.toolCalls).toEqual(["listInventory"]);
    expect(result.output).toBe("Listed.");
  });

  it("respects MAX_AGENT_ITERATIONS (edge)", async () => {
    const tools = [createViewHistoryTool({ exchangeUrl: "http://localhost:4021" })];
    const decisions = Array.from({ length: MAX_AGENT_ITERATIONS }, () =>
      Promise.resolve({
        toolCall: { name: "viewHistory", args: { sellerAgentId: "s-1", limit: 10 } },
      }),
    );
    const agent = createSellerAgent({
      llm: fakeLlm(decisions),
      tools,
      systemPrompt: SELLER_SYSTEM_PROMPT,
    });
    const result = await agent.run("loop");
    expect(result.iterations).toBe(MAX_AGENT_ITERATIONS);
  });

  it("throws on an unknown tool (failure)", async () => {
    const agent = createSellerAgent({
      llm: fakeLlm([Promise.resolve({ toolCall: { name: "nope", args: {} } })]),
      tools: [],
      systemPrompt: SELLER_SYSTEM_PROMPT,
    });
    await expect(agent.run("hi")).rejects.toThrow(/Unknown tool/);
  });
});
