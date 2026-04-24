import { createCircleClient, type CircleClient } from "@ade/wallets";

import { assertTestnet, loadScriptsConfig, type ScriptsConfig } from "./config.js";
import { banner, log } from "./logger.js";

/**
 * Create a Circle Developer-Controlled wallet set (idempotent against
 * `WALLET_SET_ID`). Prints a copy-into-.env banner with the id. Never logs
 * the Circle entity secret or API key — `log()` redacts those keys.
 */
export interface CreateWalletSetDeps {
  config?: ScriptsConfig;
  client?: CircleClient;
}

export interface CreateWalletSetResult {
  walletSetId: string;
  created: boolean;
}

const DEFAULT_WALLET_SET_NAME = "ade-demo" as const;

export async function runCreateWalletSet(
  deps: CreateWalletSetDeps = {},
): Promise<CreateWalletSetResult> {
  const config = deps.config ?? loadScriptsConfig();
  assertTestnet(config);

  if (config.WALLET_SET_ID) {
    banner("Wallet Set", [
      `Already have WALLET_SET_ID=${config.WALLET_SET_ID} — nothing to do.`,
      "Delete the WALLET_SET_ID line from .env.local to force recreation.",
    ]);
    return { walletSetId: config.WALLET_SET_ID, created: false };
  }

  const client = deps.client ?? createCircleClient({ env: process.env });
  log("Creating wallet set", { environment: config.CIRCLE_ENVIRONMENT });

  const result = await client.createWalletSet(DEFAULT_WALLET_SET_NAME);
  banner("Wallet Set Created", [
    `WALLET_SET_ID=${result.walletSetId}`,
    "Copy this line into .env.local, then run:",
    "  pnpm --filter @ade/scripts create:wallets",
  ]);
  return { walletSetId: result.walletSetId, created: true };
}

// Reason: only invoke as a CLI when this file is the entry point.
// `tsx src/createWalletSet.ts` sets import.meta.url === process.argv[1].
const isEntry =
  typeof process !== "undefined" &&
  typeof process.argv[1] === "string" &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isEntry) {
  runCreateWalletSet().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
