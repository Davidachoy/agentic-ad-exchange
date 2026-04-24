import { createCircleClient, type CircleClient, type WalletRef } from "@ade/wallets";

import { assertTestnet, loadScriptsConfig, type ScriptsConfig } from "./config.js";
import { banner, log } from "./logger.js";

/**
 * Create buyer + seller Developer-Controlled wallets on Arc testnet. Prints
 * a copy-into-.env banner so the operator can paste the ids/addresses into
 * `.env.local` before `fund:wallets` / `deposit:gateway` / `demo:load`.
 */
export interface CreateWalletsDeps {
  config?: ScriptsConfig;
  client?: CircleClient;
  walletSetIdOverride?: string;
}

export interface CreateWalletsResult {
  buyer: WalletRef;
  seller: WalletRef;
}

const DCW_BLOCKCHAIN = "ARC-TESTNET" as const;

export async function runCreateWallets(deps: CreateWalletsDeps = {}): Promise<CreateWalletsResult> {
  const config = deps.config ?? loadScriptsConfig();
  assertTestnet(config);

  const walletSetId = deps.walletSetIdOverride ?? config.WALLET_SET_ID;
  if (!walletSetId) {
    throw new Error(
      "Missing wallet set id. Run `pnpm --filter @ade/scripts create:wallet-set` first, or pass an id: `pnpm --filter @ade/scripts create:wallets <wallet-set-id>`.",
    );
  }

  const client = deps.client ?? createCircleClient({ env: process.env });
  log("Creating buyer + seller wallets", { walletSetId });

  const buyer = await client.createWallet({ walletSetId, blockchain: DCW_BLOCKCHAIN });
  let seller: WalletRef;
  try {
    seller = await client.createWallet({ walletSetId, blockchain: DCW_BLOCKCHAIN });
  } catch (err) {
    // Keep the buyer info visible so the operator can finish by rerunning
    // with the buyer ids pinned in .env.local — losing the first id to a
    // silent failure here would be the worst demo UX.
    banner("Create Wallets — Buyer only", [
      `BUYER_WALLET_ID=${buyer.walletId}`,
      `BUYER_WALLET_ADDRESS=${buyer.address}`,
      "Seller creation failed — retry after inspecting the error:",
      `  ${(err as Error).message}`,
    ]);
    throw err;
  }

  banner("Wallets Created", [
    `BUYER_WALLET_ID=${buyer.walletId}`,
    `BUYER_WALLET_ADDRESS=${buyer.address}`,
    `SELLER_WALLET_ID=${seller.walletId}`,
    `SELLER_WALLET_ADDRESS=${seller.address}`,
    "Copy the four lines above into .env.local.",
    "Next step: fund via https://faucet.circle.com (ARC Testnet).",
  ]);

  return { buyer, seller };
}

const isEntry =
  typeof process !== "undefined" &&
  typeof process.argv[1] === "string" &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isEntry) {
  runCreateWallets({ walletSetIdOverride: process.argv[2] }).catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
