import type { CircleClient, WalletRef } from "@ade/wallets";
import { describe, expect, it, vi } from "vitest";

import type { ScriptsConfig } from "./config.js";
import { runCreateWallets } from "./createWallets.js";

const baseConfig: ScriptsConfig = {
  CIRCLE_API_KEY: "test-api-key",
  CIRCLE_ENTITY_SECRET: "a".repeat(64),
  CIRCLE_ENVIRONMENT: "testnet",
  WALLET_SET_ID: "ws-env-seed",
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

const wallet = (id: string, addressSuffix: string): WalletRef => ({
  walletId: id,
  address: `0x${addressSuffix.padStart(40, "0")}`,
  blockchain: "ARC-TESTNET",
});

function mockClient(createWallet: CircleClient["createWallet"]): CircleClient {
  return {
    config: baseConfig as unknown as CircleClient["config"],
    createWalletSet: vi.fn(),
    createWallet,
    getBalance: vi.fn(),
    listTransactions: vi.fn(),
    transfer: vi.fn(),
    waitForTx: vi.fn(),
  } as CircleClient;
}

describe("runCreateWallets", () => {
  it("creates buyer and seller on ARC-TESTNET (happy path)", async () => {
    const calls: string[] = [];
    const createWallet = vi.fn(async (input: { walletSetId: string; blockchain: string }) => {
      calls.push(input.walletSetId);
      return wallet(`w-${calls.length}`, String(calls.length));
    });
    const result = await runCreateWallets({
      config: { ...baseConfig },
      client: mockClient(createWallet),
    });
    expect(result.buyer.walletId).toBe("w-1");
    expect(result.seller.walletId).toBe("w-2");
    expect(calls).toEqual(["ws-env-seed", "ws-env-seed"]);
  });

  it("prefers a CLI-supplied wallet set id over the env value (edge)", async () => {
    const seen: string[] = [];
    const createWallet = vi.fn(async (input: { walletSetId: string; blockchain: string }) => {
      seen.push(input.walletSetId);
      return wallet(`w-${seen.length}`, String(seen.length));
    });
    await runCreateWallets({
      config: { ...baseConfig },
      client: mockClient(createWallet),
      walletSetIdOverride: "ws-cli-42",
    });
    expect(seen).toEqual(["ws-cli-42", "ws-cli-42"]);
  });

  it("propagates the error if seller creation fails after buyer succeeds (failure)", async () => {
    let call = 0;
    const createWallet = vi.fn(async () => {
      call += 1;
      if (call === 1) return wallet("w-buyer", "1");
      throw new Error("Circle API 503");
    });
    await expect(
      runCreateWallets({ config: { ...baseConfig }, client: mockClient(createWallet) }),
    ).rejects.toThrow(/503/);
    expect(createWallet).toHaveBeenCalledTimes(2);
  });
});
