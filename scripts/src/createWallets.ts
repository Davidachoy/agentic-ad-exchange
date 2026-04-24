import { createCircleClient } from "@ade/wallets";

import { assertTestnet, loadScriptsConfig } from "./config.js";
import { banner, log } from "./logger.js";

async function main(): Promise<void> {
  const config = loadScriptsConfig();
  assertTestnet(config);
  const walletSetId = process.argv[2] ?? config.WALLET_SET_ID;
  if (!walletSetId) {
    throw new Error(
      "Usage: pnpm --filter @ade/scripts create:wallets <wallet-set-id> — or set WALLET_SET_ID in .env.local",
    );
  }
  const client = createCircleClient({ env: process.env });
  log("Creating buyer + seller wallets", { walletSetId });

  try {
    const buyer = await client.createWallet({ walletSetId, blockchain: "ARC-TESTNET" });
    const seller = await client.createWallet({ walletSetId, blockchain: "ARC-TESTNET" });
    banner("Wallets Created", [
      `BUYER_WALLET_ID=${buyer.walletId}  address=${buyer.address}`,
      `SELLER_WALLET_ID=${seller.walletId}  address=${seller.address}`,
      "Copy into .env.local.",
    ]);
  } catch (err) {
    banner("Create Wallets (scaffold stub)", [
      "The CircleSdkAdapter is not wired yet.",
      `error: ${(err as Error).message}`,
    ]);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
