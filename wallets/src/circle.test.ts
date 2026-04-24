import { describe, expect, it } from "vitest";

import { createCircleClient, type CircleSdkAdapter } from "./circle.js";

const validEnv = {
  CIRCLE_API_KEY: "test-api-key",
  CIRCLE_ENTITY_SECRET:
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  CIRCLE_ENVIRONMENT: "testnet",
} as NodeJS.ProcessEnv;

const wallet = (suffix: string) => `0x${suffix.padStart(40, "0")}`;

const fakeSdk = (overrides: Partial<CircleSdkAdapter> = {}): CircleSdkAdapter => ({
  createWalletSet: async () => ({ walletSetId: "ws-1" }),
  createWallet: async () => ({ walletId: "w-1", address: wallet("1"), blockchain: "ARC-TESTNET" }),
  getWalletBalance: async () => ({
    walletId: "w-1",
    usdc: "1.000000",
    asOf: "2026-04-22T12:00:00Z",
  }),
  listTransactions: async () => [],
  createTransfer: async () => ({ transactionId: "tx-1", status: "queued" }),
  ...overrides,
});

describe("createCircleClient", () => {
  it("creates a wallet (happy path)", async () => {
    const client = createCircleClient({ env: validEnv, sdk: fakeSdk() });
    const w = await client.createWallet({ walletSetId: "ws-1", blockchain: "ARC-TESTNET" });
    expect(w.walletId).toBe("w-1");
    expect(w.address).toMatch(/^0x/);
  });

  it("rejects an SDK response that fails zod validation (edge)", async () => {
    const client = createCircleClient({
      env: validEnv,
      // Reason: force-type cast — we want the SDK to return malformed data to exercise the guard.
      sdk: fakeSdk({ createWallet: async () => ({ walletId: "w-1" }) as unknown as never }),
    });
    await expect(client.createWallet({ walletSetId: "ws-1", blockchain: "X" })).rejects.toThrow();
  });

  it("throws at construction when CIRCLE_ENTITY_SECRET is missing (failure)", () => {
    expect(() =>
      createCircleClient({
        env: { ...validEnv, CIRCLE_ENTITY_SECRET: undefined } as NodeJS.ProcessEnv,
      }),
    ).toThrow(/CIRCLE_ENTITY_SECRET/);
  });
});
