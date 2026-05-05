import type { AgentTool, SellerAgent, SellerAgentRunResult } from "@ade/agent-seller";
import type { AssistantChatMessage, DashboardAssistantContext } from "@ade/shared";
import { DashboardAssistantContextSchema } from "@ade/shared";
import { describe, expect, it, vi } from "vitest";

import { generateSellerChatAgentReply } from "./sellerChatAgent.js";

const LISTING_ID = "11111111-1111-4111-8111-111111111111";
const ARC_TX_HASH = `0x${"a".repeat(64)}`;

function makeContext(): DashboardAssistantContext {
  return DashboardAssistantContextSchema.parse({
    generatedAt: "2026-04-22T12:00:00Z",
    sseConnected: false,
    demoPaused: false,
    settlementCount: 0,
    listings: [],
    bids: [],
    recentAuctions: [],
    lastAuction: null,
    lastReceipt: null,
  });
}

function makeAgent(result: SellerAgentRunResult): {
  agent: SellerAgent;
  run: ReturnType<typeof vi.fn>;
} {
  const run = vi.fn(async (_msg: string) => result);
  const agent: SellerAgent = {
    tools: [] as ReadonlyArray<AgentTool<unknown, unknown>>,
    run,
  };
  return { agent, run };
}

const messages: AssistantChatMessage[] = [{ role: "user", content: "close listing 1234" }];

describe("generateSellerChatAgentReply", () => {
  it("projects a settled runAuction result into an auction_receipt block (happy)", async () => {
    const { agent, run } = makeAgent({
      output: "Settled at $0.002.",
      toolCalls: ["runAuction"],
      iterations: 2,
      lastToolResult: {
        name: "runAuction",
        value: {
          kind: "settled",
          listingId: LISTING_ID,
          clearingPriceUsdc: "0.002000",
          status: "confirmed",
          arcTxHash: ARC_TX_HASH,
        },
      },
    });

    const res = await generateSellerChatAgentReply(agent, messages, makeContext(), {
      role: "seller",
      mode: "run_auction",
    });

    expect(res.reply).toBe("Settled at $0.002.");
    expect(res.blocks).toHaveLength(1);
    const block = res.blocks?.[0];
    expect(block?.type).toBe("auction_receipt");
    if (block?.type === "auction_receipt") {
      expect(block.status).toBe("settled");
      expect(block.clearingPriceUsdc).toBe("0.002000");
      expect(block.arcTxHash).toBe(ARC_TX_HASH);
      expect(block.marginNote && block.marginNote.length).toBeGreaterThan(0);
      expect(block.marginNote).toMatch(/0\.002|uneconomic/i);
    }

    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0]?.[0]).toContain("[mode=run_auction]");
  });

  it("emits no blocks when the last tool was listInventory in set_floor mode (edge)", async () => {
    const { agent } = makeAgent({
      output: "Listed.",
      toolCalls: ["listInventory"],
      iterations: 2,
      lastToolResult: {
        name: "listInventory",
        value: { listingId: LISTING_ID, accepted: true },
      },
    });

    const res = await generateSellerChatAgentReply(agent, messages, makeContext(), {
      role: "seller",
      mode: "set_floor",
    });

    expect(res.reply).toBe("Listed.");
    expect(res.blocks).toBeUndefined();
  });

  it("projects listing_not_found as an auction_receipt block without arcTxHash/clearingPrice (failure)", async () => {
    const { agent } = makeAgent({
      output: "That listing already cleared.",
      toolCalls: ["runAuction"],
      iterations: 2,
      lastToolResult: {
        name: "runAuction",
        value: { kind: "listing_not_found", listingId: LISTING_ID },
      },
    });

    const res = await generateSellerChatAgentReply(agent, messages, makeContext(), {
      role: "seller",
      mode: "run_auction",
    });

    expect(res.blocks).toHaveLength(1);
    const block = res.blocks?.[0];
    expect(block?.type).toBe("auction_receipt");
    if (block?.type === "auction_receipt") {
      expect(block.status).toBe("listing_not_found");
      expect(block.arcTxHash).toBeUndefined();
      expect(block.clearingPriceUsdc).toBeUndefined();
    }
  });
});
