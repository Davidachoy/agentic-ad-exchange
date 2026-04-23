import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { config } from "../src/config.js";

async function main() {
  if (!config.circleEntitySecret) {
    throw new Error("CIRCLE_ENTITY_SECRET no está en tu .env");
  }

  const client = initiateDeveloperControlledWalletsClient({
    apiKey: config.circleApiKey,
    entitySecret: config.circleEntitySecret,
  });

  const walletSet = (
    await client.createWalletSet({ name: "AdFlow-WalletSet" })
  ).data?.walletSet!;

  const wallets = (
    await client.createWallets({
      walletSetId: walletSet.id,
      blockchains: [config.arcBlockchain],
      count: 2,
      accountType: "EOA",
    })
  ).data?.wallets!;

  const [buyer, seller] = wallets;

  console.log("\n✅ Copia esto a tu .env:");
  console.log(`BUYER_WALLET_ID=${buyer.id}`);
  console.log(`BUYER_WALLET_ADDRESS=${buyer.address}`);
  console.log(`SELLER_WALLET_ID=${seller.id}`);
  console.log(`SELLER_WALLET_ADDRESS=${seller.address}`);

  console.log("\n💧 Fondea ambas wallets:");
  console.log("   https://faucet.circle.com → Arc Testnet");
}

main().catch(console.error);
