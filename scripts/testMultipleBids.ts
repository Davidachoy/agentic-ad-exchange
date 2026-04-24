import { placeBid } from "../src/agents/buyer/index.js";
import { config } from "../src/config.js";
import { getBalance } from "../src/wallets/circleClient.js";

const EXCHANGE = config.exchangeUrl;
const SELLER_ADDRESS = config.sellerEoaAddress!;
const BUYER_ID = config.buyerWalletId!;
const SELLER_ID = config.sellerWalletId!;

const BIDS = [
  { buyerId: "buyer-a", amount: 0.003 },
  { buyerId: "buyer-b", amount: 0.008 },
  { buyerId: "buyer-c", amount: 0.005 },
  { buyerId: "buyer-d", amount: 0.012 },
  { buyerId: "buyer-e", amount: 0.004 },
];

async function main() {
  console.log("📊 Balances iniciales:");
  const b0 = await getBalance(BUYER_ID);
  const s0 = await getBalance(SELLER_ID);
  console.log(`  Buyer DCW:  ${b0?.[0]?.amount} USDC`);
  console.log(`  Seller DCW: ${s0?.[0]?.amount} USDC`);

  console.log("\n📋 Creando listing...");
  const listingRes = await fetch(`${EXCHANGE}/inventory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sellerId: "seller1",
      walletAddress: SELLER_ADDRESS,
      adType: "banner",
      adFormat: "display",
      floorPrice: 0.001,
    }),
  }).then((r) => r.json() as Promise<{ listing: { listingId: string } }>);
  const listingId = listingRes.listing.listingId;
  console.log(`  listingId: ${listingId}`);

  console.log(`\n💸 Colocando ${BIDS.length} bids...`);
  const results: { buyerId: string; amount: number; tx?: string; ok: boolean; err?: string }[] = [];
  for (const b of BIDS) {
    const t0 = Date.now();
    try {
      const r = await placeBid({
        listingId,
        buyerId: b.buyerId,
        adType: "banner",
        adFormat: "display",
        amount: b.amount,
      });
      const tx = (r as any)?.payment?.transaction;
      const ms = Date.now() - t0;
      console.log(`  ✅ ${b.buyerId} $${b.amount} → tx=${tx} (${ms}ms)`);
      results.push({ buyerId: b.buyerId, amount: b.amount, tx, ok: true });
    } catch (e: any) {
      const ms = Date.now() - t0;
      console.log(`  ❌ ${b.buyerId} $${b.amount} → ${e?.message ?? e} (${ms}ms)`);
      results.push({ buyerId: b.buyerId, amount: b.amount, ok: false, err: e?.message ?? String(e) });
    }
  }

  console.log(`\n🏁 Ejecutando subasta...`);
  const auctionRes = await fetch(`${EXCHANGE}/auction/run/${listingId}`, { method: "POST" });
  const auctionJson = (await auctionRes.json()) as any;
  if (!auctionRes.ok) {
    console.log(`  ❌ auction failed: ${JSON.stringify(auctionJson)}`);
  } else {
    const r = auctionJson.receipt;
    console.log(`  🏆 winner: ${r.winnerId} (bid $${r.winningBid})`);
    console.log(`  💵 clearing price: $${r.clearingPrice} (second-price)`);
    console.log(`  🔗 ${r.arcExplorer}`);
  }

  console.log("\n📊 Balances finales:");
  const b1 = await getBalance(BUYER_ID);
  const s1 = await getBalance(SELLER_ID);
  console.log(`  Buyer DCW:  ${b1?.[0]?.amount} USDC`);
  console.log(`  Seller DCW: ${s1?.[0]?.amount} USDC`);

  const okCount = results.filter((r) => r.ok).length;
  console.log(`\n✔ Bids OK: ${okCount}/${BIDS.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
