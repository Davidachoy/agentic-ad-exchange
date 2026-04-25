import type { CircleClient } from "@ade/wallets";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ScriptsConfig } from "./config.js";
import type { DemoCycleResult } from "./demoLoad.cycle.js";
import { runDemoLoad } from "./demoLoad.js";

const TX_HASH = `0x${"d".repeat(64)}` as const;

const baseConfig: ScriptsConfig = {
  CIRCLE_API_KEY: "k",
  CIRCLE_ENTITY_SECRET: "a".repeat(64),
  CIRCLE_ENVIRONMENT: "testnet",
  WALLET_SET_ID: undefined,
  BUYER_WALLET_ID: "buyer-wallet",
  BUYER_WALLET_ADDRESS: `0x${"a".repeat(40)}`,
  SELLER_WALLET_ID: undefined,
  SELLER_WALLET_ADDRESS: `0x${"b".repeat(40)}`,
  MARKETPLACE_WALLET_ADDRESS: undefined,
  DEPOSIT_AMOUNT_USDC: "0.10",
  ARC_CHAIN_ID: undefined,
  ARC_RPC_URL: undefined,
  BUYER_CHAIN: "arcTestnet",
  BUYER_PRIVATE_KEY: undefined,
  DEPOSIT_TIMEOUT_MS: 1_500_000,
  // Reason: schema enforces min(50) at parse time, but the loop has no
  // hard-coded floor — bypassing zod here keeps test runs fast.
  DEMO_LOAD_CYCLES: 2,
  EXCHANGE_API_URL: "http://localhost:4021",
  BUYER_LUXURYCO_WALLET_ID: undefined,
  BUYER_LUXURYCO_WALLET_ADDRESS: undefined,
  BUYER_GROWTHCO_WALLET_ID: undefined,
  BUYER_GROWTHCO_WALLET_ADDRESS: undefined,
  BUYER_RETAILCO_WALLET_ID: undefined,
  BUYER_RETAILCO_WALLET_ADDRESS: undefined,
};

function fakeClient(usdc = "1.000000"): CircleClient {
  // Reason: the manifest test path only exercises getBalance during preflight;
  // the cycle itself is HTTP-driven, so the other methods are unreachable.
  return {
    config: { CIRCLE_ENVIRONMENT: "testnet" } as CircleClient["config"],
    createWalletSet: vi.fn(),
    createWallet: vi.fn(),
    getBalance: vi.fn().mockResolvedValue({
      walletId: "buyer-wallet",
      usdc,
      asOf: "2026-04-25T00:00:00.000Z",
    }),
    listTransactions: vi.fn(),
    transfer: vi.fn(),
    waitForTx: vi.fn(),
  } as unknown as CircleClient;
}

function setupHappyFetch(): ReturnType<typeof vi.spyOn> {
  let auctionCall = 0;
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    const u = url instanceof Request ? url.url : url.toString();
    if (u.endsWith("/inventory") || u.endsWith("/bid")) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (u.includes("/auction/run/")) {
      auctionCall++;
      return new Response(
        JSON.stringify({
          auctionResult: {
            auctionId: `auction-${auctionCall}`,
            clearingPriceUsdc: "0.005000",
          },
          receipt: { status: "confirmed", arcTxHash: TX_HASH },
        }),
        { status: 200 },
      );
    }
    return new Response("not found", { status: 404 });
  });
}

describe("runDemoLoad manifest writer", () => {
  beforeEach(() => {
    // Silence the demo banner / per-cycle log lines during tests.
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls writeManifest once with one entry per cycle (happy)", async () => {
    setupHappyFetch();
    const writeManifest: (r: DemoCycleResult[]) => Promise<void> = vi.fn(async () => {});

    const result = await runDemoLoad({
      config: baseConfig,
      client: fakeClient(),
      writeManifest,
      logLine: () => {},
    });

    expect(result.cycles).toBe(2);
    expect(writeManifest).toHaveBeenCalledTimes(1);
    const entries = (writeManifest as unknown as { mock: { calls: DemoCycleResult[][][] } }).mock
      .calls[0]?.[0];
    expect(entries).toHaveLength(2);
    for (const entry of entries ?? []) {
      expect(entry.explorerUrl).toMatch(/^https:\/\/testnet\.arcscan\.app\/tx\/0x[a-f0-9]{64}$/);
      expect(entry.status).toBe("confirmed");
    }
  });

  it("includes failed cycles in the manifest with their status string (edge)", async () => {
    let auctionCall = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = url instanceof Request ? url.url : url.toString();
      if (u.endsWith("/inventory") || u.endsWith("/bid")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (u.includes("/auction/run/")) {
        auctionCall++;
        const failed = auctionCall === 2;
        return new Response(
          JSON.stringify({
            auctionResult: {
              auctionId: `auction-${auctionCall}`,
              clearingPriceUsdc: "0.005000",
            },
            receipt: failed ? { status: "failed" } : { status: "confirmed", arcTxHash: TX_HASH },
          }),
          { status: 200 },
        );
      }
      return new Response("not found", { status: 404 });
    });
    const writeManifest: (r: DemoCycleResult[]) => Promise<void> = vi.fn(async () => {});

    await runDemoLoad({
      config: baseConfig,
      client: fakeClient(),
      writeManifest,
      logLine: () => {},
    });

    const entries = (writeManifest as unknown as { mock: { calls: DemoCycleResult[][][] } }).mock
      .calls[0]?.[0];
    expect(entries).toHaveLength(2);
    expect(entries?.[1]?.status).toBe("failed");
    expect(entries?.[1]?.explorerUrl).toBe("(no tx hash reported)");
    expect(entries?.[1]?.txHash).toBe("");
  });

  it("propagates writeManifest errors instead of swallowing (failure)", async () => {
    setupHappyFetch();
    const boom = new Error("disk full");
    const writeManifest: (r: DemoCycleResult[]) => Promise<void> = vi.fn(async () => {
      throw boom;
    });

    await expect(
      runDemoLoad({
        config: baseConfig,
        client: fakeClient(),
        writeManifest,
        logLine: () => {},
      }),
    ).rejects.toThrow(/disk full/);
  });
});
