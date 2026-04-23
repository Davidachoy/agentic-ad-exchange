import { GatewayClient, type SupportedChainName } from "@circle-fin/x402-batching/client";
import { config } from "../src/config.js";

async function main() {
  const client = new GatewayClient({
    chain: config.buyerChain as SupportedChainName,
    privateKey: config.buyerPrivateKey as `0x${string}`,
  });

  const before = await client.getBalances();
  console.log(`💰 Wallet balance: ${before.wallet.formatted} USDC`);
  console.log(`🏦 Gateway balance: ${before.gateway.formattedAvailable} USDC`);

  console.log("\n📤 Depositando 5 USDC en Gateway...");
  await client.deposit("5");

  const after = await client.getBalances();
  console.log(`\n✅ Deposit completado!`);
  console.log(`💰 Wallet balance: ${after.wallet.formatted} USDC`);
  console.log(`🏦 Gateway balance: ${after.gateway.formattedAvailable} USDC`);
}

main().catch(console.error);
