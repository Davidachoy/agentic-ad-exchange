import { describe, expect, it, vi } from "vitest";

import type { ScriptsConfig } from "./config.js";
import {
  runDepositGateway,
  type DepositGatewayClient,
  type GatewayBalances,
} from "./depositGateway.js";

const baseConfig: ScriptsConfig = {
  CIRCLE_API_KEY: "test-api-key",
  CIRCLE_ENTITY_SECRET: "a".repeat(64),
  CIRCLE_ENVIRONMENT: "testnet",
  WALLET_SET_ID: "ws-1",
  BUYER_WALLET_ID: "buyer-1",
  BUYER_WALLET_ADDRESS: undefined,
  SELLER_WALLET_ID: "seller-1",
  SELLER_WALLET_ADDRESS: undefined,
  MARKETPLACE_WALLET_ADDRESS: undefined,
  DEPOSIT_AMOUNT_USDC: "0.10",
  ARC_CHAIN_ID: undefined,
  ARC_RPC_URL: undefined,
  BUYER_CHAIN: "arcTestnet",
  BUYER_PRIVATE_KEY: `0x${"a".repeat(64)}`,
  DEPOSIT_TIMEOUT_MS: 300_000,
  DEMO_LOAD_CYCLES: 50,
};

function mkBalances(wallet: string, gateway: string): GatewayBalances {
  return {
    wallet: { formatted: wallet },
    gateway: { formattedAvailable: gateway },
  };
}

describe("runDepositGateway", () => {
  it("credits on the second poll (happy path)", async () => {
    const balances = [
      mkBalances("5.000000", "0.000000"), // before
      mkBalances("4.900000", "0.000000"), // poll #1 — not yet credited
      mkBalances("4.900000", "0.100000"), // poll #2 — credited
    ];
    let call = 0;
    const client: DepositGatewayClient = {
      getBalances: vi.fn(async () => balances[call++]!),
      deposit: vi.fn(async () => ({ depositTxHash: "0xdeposit" })),
    };
    let fakeNow = 0;
    const result = await runDepositGateway({
      config: { ...baseConfig },
      client,
      now: () => fakeNow,
      sleep: vi.fn(async (ms) => {
        fakeNow += ms;
      }),
      pollIntervalMs: 60_000,
    });
    expect(result.depositTxHash).toBe("0xdeposit");
    expect(result.after.gateway.formattedAvailable).toBe("0.100000");
    expect(client.deposit).toHaveBeenCalledWith("0.10");
    expect(client.getBalances).toHaveBeenCalledTimes(3);
  });

  it("fails fast when BUYER_PRIVATE_KEY is missing (edge)", async () => {
    const client: DepositGatewayClient = {
      getBalances: vi.fn(),
      deposit: vi.fn(),
    };
    await expect(
      runDepositGateway({
        config: { ...baseConfig, BUYER_PRIVATE_KEY: undefined },
        client,
      }),
    ).rejects.toThrow(/BUYER_PRIVATE_KEY/);
    expect(client.getBalances).not.toHaveBeenCalled();
    expect(client.deposit).not.toHaveBeenCalled();
  });

  it("throws a timeout error when the deposit never credits (failure)", async () => {
    const client: DepositGatewayClient = {
      getBalances: vi.fn(async () => mkBalances("5.000000", "0.000000")),
      deposit: vi.fn(async () => ({ depositTxHash: "0xdeposit" })),
    };
    let fakeNow = 0;
    await expect(
      runDepositGateway({
        config: { ...baseConfig, DEPOSIT_TIMEOUT_MS: 180_000 },
        client,
        now: () => fakeNow,
        sleep: vi.fn(async (ms) => {
          fakeNow += ms;
        }),
        pollIntervalMs: 60_000,
      }),
    ).rejects.toThrow(/not credited within/);
  });
});
