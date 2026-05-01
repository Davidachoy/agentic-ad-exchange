import { describe, expect, it, vi } from "vitest";

import type { SellerAgent } from "./agent.js";
import type { SellerAgentConfig } from "./config.js";
import { runSeller } from "./run.js";

const wallet = (s: string) => `0x${s.padStart(40, "0")}`;

const baseConfig: SellerAgentConfig = {
  GEMINI_API_KEY: "test-key",
  GEMINI_MODEL: "gemini-2.5-flash",
  EXCHANGE_API_URL: "http://localhost:4021",
  SELLER_WALLET_ADDRESS: wallet("1"),
  SELLER_LISTING_INTERVAL_MS: 30_000,
};

function fakeAgent(toolCalls: string[]): SellerAgent {
  return {
    tools: [],
    async run() {
      return { output: "ok", toolCalls, iterations: 1 };
    },
  };
}

function controlResponse(paused: boolean): Response {
  return new Response(JSON.stringify({ paused }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function makeFetchByUrl(handlers: Record<string, () => Response>): typeof fetch {
  return (async (url: RequestInfo | URL) => {
    const u = url.toString();
    for (const [needle, fn] of Object.entries(handlers)) {
      if (u.includes(needle)) return fn();
    }
    throw new Error(`unhandled url: ${u}`);
  }) as unknown as typeof fetch;
}

const runningFetch = makeFetchByUrl({ "/control/state": () => controlResponse(false) });

describe("runSeller", () => {
  it("registers a listing on the first cycle (happy)", async () => {
    const agent = fakeAgent(["listInventory"]);
    const result = await runSeller({
      config: baseConfig,
      agent,
      fetchImpl: runningFetch,
      maxCycles: 1,
      sleepImpl: async () => {},
      log: () => {},
    });
    expect(result.cycles).toBe(1);
    expect(result.registered).toBe(1);
  });

  it("rotates through listing templates across cycles (edge)", async () => {
    const prompts: string[] = [];
    const result = await runSeller({
      config: baseConfig,
      agent: fakeAgent(["listInventory"]),
      fetchImpl: runningFetch,
      maxCycles: 2,
      sleepImpl: async () => {},
      log: () => {},
      onPrompt: (p) => prompts.push(p),
    });
    expect(result.cycles).toBe(2);
    expect(result.registered).toBe(2);
    expect(prompts).toHaveLength(2);
    expect(prompts[0]).toContain("premium-fashion");
    expect(prompts[1]).toContain("dev-news");
  });

  it("logs cycle_error and continues when agent.run rejects (failure)", async () => {
    const agent: SellerAgent = {
      tools: [],
      async run() {
        throw new Error("agent down");
      },
    };
    const log = vi.fn();
    const result = await runSeller({
      config: baseConfig,
      agent,
      fetchImpl: runningFetch,
      maxCycles: 1,
      sleepImpl: async () => {},
      log,
    });
    expect(result.cycles).toBe(1);
    expect(result.registered).toBe(0);
    expect(log).toHaveBeenCalledWith(
      "cycle_error",
      expect.objectContaining({ error: "agent down" }),
    );
  });

  it("skips the cycle without calling the agent when control says paused", async () => {
    const agent = fakeAgent(["listInventory"]);
    const runSpy = vi.spyOn(agent, "run");
    const log = vi.fn();
    const fetchImpl = makeFetchByUrl({
      "/control/state": () => controlResponse(true),
    });
    const result = await runSeller({
      config: baseConfig,
      agent,
      fetchImpl,
      maxCycles: 1,
      sleepImpl: async () => {},
      log,
    });
    expect(result.cycles).toBe(1);
    expect(result.registered).toBe(0);
    expect(runSpy).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("cycle_paused", expect.any(Object));
  });
});
