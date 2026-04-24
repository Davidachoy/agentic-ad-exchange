import { z } from "zod";

import { loadWalletsConfig, type WalletsConfig } from "./config.js";
import {
  BalanceSnapshotSchema,
  TransactionRefSchema,
  WalletRefSchema,
  type BalanceSnapshot,
  type TransactionRef,
  type WalletRef,
} from "./types.js";

/**
 * Typed surface over Circle Developer-Controlled Wallets. Every method runs
 * its SDK response through a zod schema before returning — callers never
 * touch the raw SDK shape.
 *
 * TODO(post-scaffold): wire real @circle-fin/developer-controlled-wallets
 * calls. Verify method signatures against github.com/circlefin/developer-controlled-wallets
 * before implementing — the SDK has shifted between tutorial versions.
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
}

/**
 * Thin adapter shape — kept intentionally small so post-scaffold PRPs wire
 * the real SDK into one place. At scaffold time the methods throw to make
 * any accidental call loud; tests mock this boundary.
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
}

export interface CreateCircleClientArgs {
  env?: NodeJS.ProcessEnv;
  /** Inject a mock SDK in tests. When undefined, a scaffold-time stub throws. */
  sdk?: CircleSdkAdapter;
}

export function createCircleClient(args: CreateCircleClientArgs = {}): CircleClient {
  const config = loadWalletsConfig(args.env);
  const sdk = args.sdk ?? scaffoldStubSdk();
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
  };
}

function scaffoldStubSdk(): CircleSdkAdapter {
  const throwStub = (name: string): never => {
    throw new Error(
      `CircleSdkAdapter.${name} is not wired yet. Post-scaffold: wire @circle-fin/developer-controlled-wallets in wallets/src/circle.ts.`,
    );
  };
  return {
    createWalletSet: () => throwStub("createWalletSet"),
    createWallet: () => throwStub("createWallet"),
    getWalletBalance: () => throwStub("getWalletBalance"),
    listTransactions: () => throwStub("listTransactions"),
    createTransfer: () => throwStub("createTransfer"),
  };
}
