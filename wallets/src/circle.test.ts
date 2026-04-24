import { describe, expect, it, vi } from "vitest";

import { createCircleClient, type CircleSdkAdapter } from "./circle.js";

const validEnv = {
  CIRCLE_API_KEY: "test-api-key",
  CIRCLE_ENTITY_SECRET: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
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
  getTransaction: async () => ({
    transactionId: "tx-1",
    txHash: `0x${"f".repeat(64)}`,
    state: "COMPLETE",
    blockchain: "ARC-TESTNET",
  }),
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

  it("treats blank WALLET_SET_ID as unset (regression: dotenv loads blank lines as '')", () => {
    expect(() =>
      createCircleClient({
        env: { ...validEnv, WALLET_SET_ID: "" } as NodeJS.ProcessEnv,
        sdk: fakeSdk(),
      }),
    ).not.toThrow();
  });
});

describe("waitForTx", () => {
  it("returns the receipt when state reaches COMPLETE (happy path)", async () => {
    const sleep = vi.fn(async () => undefined);
    const states = ["QUEUED", "SENT", "COMPLETE"];
    let i = 0;
    const sdk = fakeSdk({
      getTransaction: async () => ({
        transactionId: "tx-1",
        txHash: `0x${"a".repeat(64)}`,
        state: states[i++] ?? "COMPLETE",
        blockchain: "ARC-TESTNET",
      }),
    });
    const client = createCircleClient({ env: validEnv, sdk, sleep });
    const receipt = await client.waitForTx({
      transactionId: "tx-1",
      intervalMs: 10,
      maxAttempts: 5,
    });
    expect(receipt.state).toBe("COMPLETE");
    expect(receipt.txHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("short-circuits on the first poll when already COMPLETE (edge)", async () => {
    const sleep = vi.fn(async () => undefined);
    const sdk = fakeSdk();
    const client = createCircleClient({ env: validEnv, sdk, sleep });
    const receipt = await client.waitForTx({
      transactionId: "tx-1",
      intervalMs: 10,
      maxAttempts: 3,
    });
    expect(receipt.state).toBe("COMPLETE");
    expect(sleep).not.toHaveBeenCalled();
  });

  it("throws when the SDK reports a terminal FAILED state (failure)", async () => {
    const sleep = vi.fn(async () => undefined);
    const sdk = fakeSdk({
      getTransaction: async () => ({
        transactionId: "tx-1",
        state: "FAILED",
      }),
    });
    const client = createCircleClient({ env: validEnv, sdk, sleep });
    await expect(
      client.waitForTx({ transactionId: "tx-1", intervalMs: 10, maxAttempts: 3 }),
    ).rejects.toThrow(/FAILED/);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("throws a timeout error when maxAttempts elapses without COMPLETE (failure)", async () => {
    const sleep = vi.fn(async () => undefined);
    const sdk = fakeSdk({
      getTransaction: async () => ({
        transactionId: "tx-1",
        state: "QUEUED",
      }),
    });
    const client = createCircleClient({ env: validEnv, sdk, sleep });
    await expect(
      client.waitForTx({ transactionId: "tx-1", intervalMs: 10, maxAttempts: 3 }),
    ).rejects.toThrow(/timeout/);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});
