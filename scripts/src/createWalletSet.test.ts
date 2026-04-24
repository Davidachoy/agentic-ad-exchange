import type { CircleClient } from "@ade/wallets";
import { describe, expect, it, vi } from "vitest";

import type { ScriptsConfig } from "./config.js";
import { runCreateWalletSet } from "./createWalletSet.js";

const baseConfig: ScriptsConfig = {
  CIRCLE_API_KEY: "test-api-key",
  CIRCLE_ENTITY_SECRET: "a".repeat(64),
  CIRCLE_ENVIRONMENT: "testnet",
  WALLET_SET_ID: undefined,
  BUYER_WALLET_ID: undefined,
  BUYER_WALLET_ADDRESS: undefined,
  SELLER_WALLET_ID: undefined,
  SELLER_WALLET_ADDRESS: undefined,
  MARKETPLACE_WALLET_ADDRESS: undefined,
  DEPOSIT_AMOUNT_USDC: "0.10",
  ARC_CHAIN_ID: undefined,
  ARC_RPC_URL: undefined,
  BUYER_CHAIN: "arcTestnet",
  BUYER_PRIVATE_KEY: undefined,
  DEPOSIT_TIMEOUT_MS: 1_500_000,
  DEMO_LOAD_CYCLES: 50,
};

function mockClient(overrides: Partial<CircleClient> = {}): CircleClient {
  return {
    config: baseConfig as unknown as CircleClient["config"],
    createWalletSet: vi.fn(async () => ({ walletSetId: "ws-new-123" })),
    createWallet: vi.fn(),
    getBalance: vi.fn(),
    listTransactions: vi.fn(),
    transfer: vi.fn(),
    waitForTx: vi.fn(),
    ...overrides,
  } as CircleClient;
}

describe("runCreateWalletSet", () => {
  it("creates a new wallet set and returns its id (happy path)", async () => {
    const client = mockClient();
    const result = await runCreateWalletSet({
      config: { ...baseConfig },
      client,
    });
    expect(result.walletSetId).toBe("ws-new-123");
    expect(result.created).toBe(true);
    expect(client.createWalletSet).toHaveBeenCalledWith("ade-demo");
  });

  it("short-circuits when WALLET_SET_ID is already present (edge)", async () => {
    const client = mockClient();
    const result = await runCreateWalletSet({
      config: { ...baseConfig, WALLET_SET_ID: "ws-existing-9" },
      client,
    });
    expect(result.walletSetId).toBe("ws-existing-9");
    expect(result.created).toBe(false);
    expect(client.createWalletSet).not.toHaveBeenCalled();
  });

  it("surfaces the underlying SDK failure (failure case)", async () => {
    const client = mockClient({
      createWalletSet: vi.fn(async () => {
        throw new Error("Circle API 500");
      }),
    });
    await expect(runCreateWalletSet({ config: { ...baseConfig }, client })).rejects.toThrow(
      /Circle API 500/,
    );
  });
});
