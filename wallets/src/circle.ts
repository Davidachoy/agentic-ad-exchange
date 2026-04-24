import { z } from "zod";

import { createRealCircleSdk } from "./circleAdapter.js";
import { loadWalletsConfig, type WalletsConfig } from "./config.js";
import {
  BalanceSnapshotSchema,
  TransactionReceiptSchema,
  TransactionRefSchema,
  WalletRefSchema,
  type BalanceSnapshot,
  type TransactionReceipt,
  type TransactionRef,
  type WalletRef,
} from "./types.js";

/**
 * Typed surface over Circle Developer-Controlled Wallets. Every method runs
 * its SDK response through a zod schema before returning — callers never
 * touch the raw SDK shape.
 */
export interface CircleClient {
  readonly config: Readonly<WalletsConfig>;
  createWalletSet(name: string): Promise<{ walletSetId: string }>;
  createWallet(input: { walletSetId: string; blockchain: string }): Promise<WalletRef>;
  getBalance(walletId: string): Promise<BalanceSnapshot>;
  listTransactions(walletId: string): Promise<TransactionRef[]>;
  transfer(input: {
    walletId: string;
    destinationAddress: string;
    amountUsdc: string;
  }): Promise<TransactionRef>;
  waitForTx(input: {
    transactionId: string;
    maxAttempts?: number;
    intervalMs?: number;
  }): Promise<TransactionReceipt>;
}

/**
 * Thin adapter shape — the only place Circle SDK method signatures live.
 * Tests mock this boundary so business logic stays decoupled from the SDK.
 */
export interface CircleSdkAdapter {
  createWalletSet(args: { name: string }): Promise<unknown>;
  createWallet(args: { walletSetId: string; blockchain: string }): Promise<unknown>;
  getWalletBalance(args: { walletId: string }): Promise<unknown>;
  listTransactions(args: { walletId: string }): Promise<unknown>;
  createTransfer(args: {
    walletId: string;
    destinationAddress: string;
    amountUsdc: string;
  }): Promise<unknown>;
  getTransaction(args: { transactionId: string }): Promise<unknown>;
}

export interface CreateCircleClientArgs {
  env?: NodeJS.ProcessEnv;
  /** Inject a mock SDK in tests. Defaults to the real Circle-SDK-backed adapter. */
  sdk?: CircleSdkAdapter;
  /** Inject a sleep function for deterministic polling in tests. Defaults to setTimeout. */
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_WAIT_INTERVAL_MS = 2_000;
const DEFAULT_WAIT_MAX_ATTEMPTS = 30;

export function createCircleClient(args: CreateCircleClientArgs = {}): CircleClient {
  const config = loadWalletsConfig(args.env);
  const sdk = args.sdk ?? createRealCircleSdk(config);
  const sleep = args.sleep ?? defaultSleep;

  return {
    config,
    async createWalletSet(name) {
      const raw = await sdk.createWalletSet({ name });
      return z.object({ walletSetId: z.string().min(1) }).parse(raw);
    },
    async createWallet(input) {
      const raw = await sdk.createWallet(input);
      return WalletRefSchema.parse(raw);
    },
    async getBalance(walletId) {
      const raw = await sdk.getWalletBalance({ walletId });
      return BalanceSnapshotSchema.parse(raw);
    },
    async listTransactions(walletId) {
      const raw = await sdk.listTransactions({ walletId });
      return z.array(TransactionRefSchema).parse(raw);
    },
    async transfer(input) {
      const raw = await sdk.createTransfer(input);
      return TransactionRefSchema.parse(raw);
    },
    async waitForTx({
      transactionId,
      maxAttempts = DEFAULT_WAIT_MAX_ATTEMPTS,
      intervalMs = DEFAULT_WAIT_INTERVAL_MS,
    }) {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const raw = await sdk.getTransaction({ transactionId });
        const parsed = TransactionReceiptSchema.parse(raw);
        if (parsed.state === "COMPLETE") return parsed;
        if (
          parsed.state === "FAILED" ||
          parsed.state === "CANCELLED" ||
          parsed.state === "DENIED"
        ) {
          throw new Error(`transaction ${transactionId} ended in ${parsed.state}`);
        }
        if (attempt < maxAttempts) await sleep(intervalMs);
      }
      throw new Error(`waitForTx timeout after ${maxAttempts} attempts (${transactionId})`);
    },
  };
}

/**
 * Test-only adapter stub — every method throws. Exported so integration
 * tests can assert "not wired" paths deliberately.
 */
export function throwingStubSdk(): CircleSdkAdapter {
  const throwStub = (name: string): never => {
    throw new Error(`CircleSdkAdapter.${name} is a test stub. Inject a real or mocked adapter.`);
  };
  return {
    createWalletSet: () => throwStub("createWalletSet"),
    createWallet: () => throwStub("createWallet"),
    getWalletBalance: () => throwStub("getWalletBalance"),
    listTransactions: () => throwStub("listTransactions"),
    createTransfer: () => throwStub("createTransfer"),
    getTransaction: () => throwStub("getTransaction"),
  };
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
