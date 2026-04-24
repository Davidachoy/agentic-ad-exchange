import type { BalanceSnapshot, CircleClient } from "@ade/wallets";
import { describe, expect, it, vi } from "vitest";

import type { ScriptsConfig } from "./config.js";
import { runFundWallets } from "./fundWallets.js";

const baseConfig: ScriptsConfig = {
  CIRCLE_API_KEY: "test-api-key",
  CIRCLE_ENTITY_SECRET: "a".repeat(64),
  CIRCLE_ENVIRONMENT: "testnet",
  WALLET_SET_ID: "ws-1",
  BUYER_WALLET_ID: "buyer-abc-1234",
  BUYER_WALLET_ADDRESS: undefined,
  SELLER_WALLET_ID: "seller-xyz-5678",
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

const balance = (walletId: string, usdc: string): BalanceSnapshot => ({
  walletId,
  usdc,
  asOf: "2026-04-23T00:00:00Z",
});

function mockClient(getBalance: CircleClient["getBalance"]): CircleClient {
  return {
    config: baseConfig as unknown as CircleClient["config"],
    createWalletSet: vi.fn(),
    createWallet: vi.fn(),
    getBalance,
    listTransactions: vi.fn(),
    transfer: vi.fn(),
    waitForTx: vi.fn(),
  } as CircleClient;
}

describe("runFundWallets", () => {
  it("fetches and reports buyer + seller balances (happy path)", async () => {
    const getBalance = vi.fn(async (id: string) =>
      balance(id, id.startsWith("buyer") ? "1.234567" : "0.500000"),
    );
    const result = await runFundWallets({
      config: { ...baseConfig },
      client: mockClient(getBalance),
    });
    expect(result.skipped).toBe(false);
    expect(result.buyer?.usdc).toBe("1.234567");
    expect(result.seller?.usdc).toBe("0.500000");
    expect(getBalance).toHaveBeenCalledTimes(2);
  });

  it("skips without error when SELLER_WALLET_ID is missing (edge)", async () => {
    const getBalance = vi.fn();
    const result = await runFundWallets({
      config: { ...baseConfig, SELLER_WALLET_ID: undefined },
      client: mockClient(getBalance),
    });
    expect(result.skipped).toBe(true);
    expect(getBalance).not.toHaveBeenCalled();
  });

  it("surfaces a Circle SDK failure with a clear error (failure case)", async () => {
    const getBalance = vi.fn(async () => {
      throw new Error("Circle balance 500");
    });
    await expect(
      runFundWallets({ config: { ...baseConfig }, client: mockClient(getBalance) }),
    ).rejects.toThrow(/Circle balance 500/);
  });
});
