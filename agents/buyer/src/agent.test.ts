import { MAX_AGENT_ITERATIONS } from "@ade/shared";
import { describe, expect, it, vi } from "vitest";

import { createBuyerAgent, type LlmAdapter } from "./agent.js";
import { BUYER_SYSTEM_PROMPT } from "./prompt.js";
import {
  createCheckBalanceTool,
  createPlaceBidTool,
  createReviewAuctionTool,
} from "./tools/index.js";

function fakeLlm(
  decisions: ReturnType<LlmAdapter["step"]>[],
): LlmAdapter {
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
const nonce = (s: string) => `0x${s.padStart(64, "0")}`;

const bid = {
  bidId: "11111111-1111-4111-8111-111111111111",
  buyerAgentId: "buyer-1",
  buyerWallet: wallet("2"),
  targeting: {
    adType: "display" as const,
    format: "banner",
    size: "300x250",
    contextTags: [],
  },
  bidAmountUsdc: "0.005",
  budgetRemainingUsdc: "1.000000",
  nonce: nonce("a"),
  createdAt: "2026-04-22T12:00:00Z",
};

describe("createBuyerAgent", () => {
  it("selects placeBid for a bid instruction (happy)", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ bidId: bid.bidId }), { status: 202 }),
    );
    const tools = [
      createPlaceBidTool({ exchangeUrl: "http://localhost:4021", fetchImpl }),
      createCheckBalanceTool({ exchangeUrl: "http://localhost:4021" }),
      createReviewAuctionTool({ exchangeUrl: "http://localhost:4021" }),
    ];
    const agent = createBuyerAgent({
      llm: fakeLlm([
        Promise.resolve({ toolCall: { name: "placeBid", args: bid } }),
        Promise.resolve({ final: "Bid placed." }),
      ]),
      tools,
      systemPrompt: BUYER_SYSTEM_PROMPT,
    });
    const result = await agent.run("Bid 0.005 on display 300x250");
    expect(result.toolCalls).toEqual(["placeBid"]);
    expect(result.output).toBe("Bid placed.");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("stops at MAX_AGENT_ITERATIONS when the LLM keeps calling tools (edge)", async () => {
    const tools = [createCheckBalanceTool({ exchangeUrl: "http://localhost:4021" })];
    // Script MAX_AGENT_ITERATIONS rounds of the same tool call — no `final` ever returned.
    const decisions = Array.from({ length: MAX_AGENT_ITERATIONS }, () =>
      Promise.resolve({ toolCall: { name: "checkBalance", args: { walletId: "w-1" } } }),
    );
    const agent = createBuyerAgent({
      llm: fakeLlm(decisions),
      tools,
      systemPrompt: BUYER_SYSTEM_PROMPT,
    });
    const result = await agent.run("loop");
    expect(result.iterations).toBe(MAX_AGENT_ITERATIONS);
    expect(result.output).toContain("iteration cap");
  });

  it("throws when the LLM calls an unknown tool (failure)", async () => {
    const agent = createBuyerAgent({
      llm: fakeLlm([Promise.resolve({ toolCall: { name: "unknown", args: {} } })]),
      tools: [],
      systemPrompt: BUYER_SYSTEM_PROMPT,
    });
    await expect(agent.run("hi")).rejects.toThrow(/Unknown tool/);
  });
});
