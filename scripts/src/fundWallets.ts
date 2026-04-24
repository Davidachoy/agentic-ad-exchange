import { createCircleClient, type BalanceSnapshot, type CircleClient } from "@ade/wallets";

import { assertTestnet, loadScriptsConfig, type ScriptsConfig } from "./config.js";
import { banner, log } from "./logger.js";

/**
 * Circle's testnet faucet is a human-only web form, so this script can't
 * actually move USDC — it prints the manual-step banner *and* reports the
 * current buyer/seller balances so the operator can verify funding landed.
 */
export interface FundWalletsDeps {
  config?: ScriptsConfig;
  client?: CircleClient;
}

export interface FundWalletsSummary {
  skipped: boolean;
  buyer?: BalanceSnapshot;
  seller?: BalanceSnapshot;
}

export async function runFundWallets(deps: FundWalletsDeps = {}): Promise<FundWalletsSummary> {
  const config = deps.config ?? loadScriptsConfig();
  assertTestnet(config);

  if (!config.BUYER_WALLET_ID || !config.SELLER_WALLET_ID) {
    banner("Fund Wallets — wallets not yet created", [
      "BUYER_WALLET_ID and/or SELLER_WALLET_ID are empty in .env.local.",
      "Run `pnpm --filter @ade/scripts create:wallets <wallet-set-id>` first,",
      "then re-run this script.",
    ]);
    return { skipped: true };
  }

  const client = deps.client ?? createCircleClient({ env: process.env });
  log("Fetching balances", {
    buyerWalletId: config.BUYER_WALLET_ID,
    sellerWalletId: config.SELLER_WALLET_ID,
  });

  const buyer = await client.getBalance(config.BUYER_WALLET_ID);
  const seller = await client.getBalance(config.SELLER_WALLET_ID);

  banner("Fund Wallets", [
    "Circle's testnet faucet is a human-only web form:",
    "  1) Open https://faucet.circle.com",
    "  2) Select ARC Testnet",
    "  3) Paste the buyer and seller wallet addresses (below)",
    "  4) Request USDC — 0.20 USDC per wallet covers the demo",
    "",
    "Current balances:",
    `  Buyer  ${buyer.usdc.padEnd(10)} USDC   wallet=${maskWalletId(config.BUYER_WALLET_ID)}`,
    `  Seller ${seller.usdc.padEnd(10)} USDC   wallet=${maskWalletId(config.SELLER_WALLET_ID)}`,
  ]);

  return { skipped: false, buyer, seller };
}

/**
 * Reduce a Circle wallet id to a short visual fingerprint. We don't log full
 * wallet ids to stdout because they're stable handles to funds — masking
 * cuts shoulder-surfing risk while still letting the operator distinguish
 * two wallets at a glance.
 */
function maskWalletId(walletId: string): string {
  if (walletId.length <= 10) return walletId;
  return `${walletId.slice(0, 6)}…${walletId.slice(-4)}`;
}

const isEntry =
  typeof process !== "undefined" &&
  typeof process.argv[1] === "string" &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isEntry) {
  runFundWallets().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
