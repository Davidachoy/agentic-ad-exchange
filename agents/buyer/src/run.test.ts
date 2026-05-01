import { describe, expect, it, vi } from "vitest";

import type { BuyerAgent } from "./agent.js";
import type { BuyerAgentConfig } from "./config.js";
import { runBuyer } from "./run.js";

const wallet = (s: string) => `0x${s.padStart(40, "0")}`;

const baseConfig: BuyerAgentConfig = {
  GEMINI_API_KEY: "test-key",
  GEMINI_MODEL: "gemini-2.5-flash",
  EXCHANGE_API_URL: "http://localhost:4021",
  BUYER_PRIVATE_KEY: undefined,
  BUYER_CHAIN: "arcTestnet",
  BUYER_AGENT_ID: "buyer-test",
  BUYER_AGENT_BRAND: "TestCo",
  BUYER_AGENT_STRATEGY: "Bid floor on everything.",
  BUYER_AGENT_MAX_BID_USDC: "0.005",
  BUYER_AGENT_MIN_BID_USDC: "0.001",
  BUYER_AGENT_PREFERRED_TAGS: ["test", "demo"],
  BUYER_WALLET_ADDRESS: wallet("a"),
  BUYER_POLL_INTERVAL_MS: 1000,
};

const sampleListing = {
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

function inventoryResponse(items: unknown[]): Response {
  return new Response(JSON.stringify({ items }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function fakeAgent(toolCalls: string[]): BuyerAgent {
  return {
    tools: [],
    async run() {
      return { output: "ok", toolCalls, iterations: 1 };
    },
  };
}

describe("runBuyer", () => {
  it("places a bid on the first available listing (happy)", async () => {
    const fetchImpl = vi.fn(async () => inventoryResponse([sampleListing]));
    const result = await runBuyer({
      config: baseConfig,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      agent: fakeAgent(["placeBid"]),
      maxCycles: 1,
      sleepImpl: async () => {},
      log: () => {},
    });
    expect(result.cycles).toBe(1);
    expect(result.bids).toBe(1);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("dedupes a listing seen in a prior cycle (edge)", async () => {
    const fetchImpl = vi.fn(async () => inventoryResponse([sampleListing]));
    const agent = fakeAgent(["placeBid"]);
    const runSpy = vi.spyOn(agent, "run");
    const result = await runBuyer({
      config: baseConfig,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      agent,
      maxCycles: 2,
      sleepImpl: async () => {},
      log: () => {},
    });
    expect(result.cycles).toBe(2);
    expect(result.bids).toBe(1);
    expect(runSpy).toHaveBeenCalledOnce();
  });

  it("logs cycle_error and continues when fetch rejects (failure)", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });
    const log = vi.fn();
    const result = await runBuyer({
      config: baseConfig,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      agent: fakeAgent(["placeBid"]),
      maxCycles: 1,
      sleepImpl: async () => {},
      log,
    });
    expect(result.cycles).toBe(1);
    expect(result.bids).toBe(0);
    expect(log).toHaveBeenCalledWith(
      "cycle_error",
      expect.objectContaining({ error: "network down" }),
    );
  });
});
