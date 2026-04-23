import { transferUSDC, getBalance, waitForTx } from "../src/wallets/index.js";
import { config } from "../src/config.js";

const BUYER_ADDRESS = config.buyerWalletAddress!;
const SELLER_ADDRESS = config.sellerWalletAddress!;
const BUYER_ID = config.buyerWalletId!;
const SELLER_ID = config.sellerWalletId!;

async function main() {
  console.log("📊 Balances antes:");
  const buyerBefore = await getBalance(BUYER_ID);
  const sellerBefore = await getBalance(SELLER_ID);
  console.log(`  Buyer:  ${buyerBefore?.[0]?.amount} USDC`);
  console.log(`  Seller: ${sellerBefore?.[0]?.amount} USDC`);

  console.log("\n💸 Enviando $0.001 USDC...");
  const txId = await transferUSDC(BUYER_ADDRESS, SELLER_ADDRESS, "0.001");
  console.log(`  TX ID: ${txId}`);

  console.log("\n⏳ Esperando confirmación...");
  const confirmed = await waitForTx(txId);
  console.log(`  ✅ Confirmado!`);
  console.log(`  🔍 ${config.arcExplorerUrl}/tx/${confirmed?.txHash}`);

  console.log("\n📊 Balances después:");
  const buyerAfter = await getBalance(BUYER_ID);
  const sellerAfter = await getBalance(SELLER_ID);
  console.log(`  Buyer:  ${buyerAfter?.[0]?.amount} USDC`);
  console.log(`  Seller: ${sellerAfter?.[0]?.amount} USDC`);
}

main().catch(console.error);
