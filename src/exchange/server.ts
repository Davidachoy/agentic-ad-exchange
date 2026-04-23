import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";
import { config } from "../config.js";
import type { Bid, InventoryListing, AuctionResult, AuctionReceipt } from "../types/index.js";
import { runSecondPriceAuction } from "./auction.js";
import { transferUSDC, waitForTx } from "../wallets/circleClient.js";

if (!config.sellerEoaAddress) {
  throw new Error("SELLER_EOA_ADDRESS missing — the facilitator needs an EOA to pay out to");
}

const SELLER_ADDRESS = config.sellerEoaAddress;

// CAIP-2: Arc Testnet = eip155:5042002, Base Sepolia = eip155:84532
const NETWORK = config.x402Network;
const FACILITATOR_URL = config.circleFacilitatorUrl;

const app = express();
app.use(cors({ exposedHeaders: ["PAYMENT-REQUIRED", "PAYMENT-RESPONSE"] }));
app.use(express.json());

// Circle Gateway middleware: handles 402 issuance, signature verification,
// and batched USDC settlement against the GatewayWallet contract.
const gateway = createGatewayMiddleware({
  sellerAddress: SELLER_ADDRESS,
  networks: [NETWORK],
  facilitatorUrl: FACILITATOR_URL,
  description: "Place a bid in the RTB auction",
});

const requireBidPayment = gateway.require("$0.001");

app.use((req, _res, next) => {
  const sig = req.headers["payment-signature"] ? "yes" : "no";
  console.log(`→ ${req.method} ${req.path} (payment-signature: ${sig})`);
  next();
});

// ── In-memory state ──────────────────────────────────────────
const listings = new Map<string, InventoryListing>();
const pendingBids = new Map<string, Bid[]>();
const results = new Map<string, AuctionResult>();
const receipts = new Map<string, AuctionReceipt>();

// ── Endpoints ────────────────────────────────────────────────

app.post("/inventory", (req, res) => {
  const listing: InventoryListing = {
    listingId: randomUUID(),
    sellerId: req.body.sellerId,
    walletAddress: req.body.walletAddress,
    adType: req.body.adType,
    adFormat: req.body.adFormat,
    floorPrice: req.body.floorPrice ?? 0.001,
  };
  listings.set(listing.listingId, listing);
  pendingBids.set(listing.listingId, []);
  console.log(`📋 Inventory listed: ${listing.listingId}`);
  res.json({ success: true, listing });
});

// Paid endpoint: every bid costs $0.001 USDC, settled via Circle Gateway.
app.post("/auction/bid", requireBidPayment, (req: any, res) => {
  const { listingId, buyerId, walletAddress, adType, adFormat, amount } = req.body;

  if (!listings.has(listingId)) {
    return res.status(404).json({ error: "Listing not found" });
  }

  const bid: Bid = {
    bidId: randomUUID(),
    buyerId,
    walletAddress,
    adType,
    adFormat,
    amount,
    timestamp: Date.now(),
  };
  pendingBids.get(listingId)!.push(bid);

  const payer = req.payment?.payer;
  const tx = req.payment?.transaction;
  console.log(
    `💰 Bid: $${amount} from ${buyerId}` +
      (payer ? ` | payer=${payer}` : "") +
      (tx ? ` | tx=${tx}` : "")
  );

  res.json({ success: true, bid, payment: req.payment });
});

app.post("/auction/run/:listingId", async (req, res) => {
  const { listingId } = req.params;
  const listing = listings.get(listingId);
  const bids = pendingBids.get(listingId);
  if (!listing || !bids?.length) {
    return res.status(400).json({ error: "No listing or bids" });
  }
  const result = runSecondPriceAuction(listing, bids);
  if (!result) return res.status(400).json({ error: "No eligible bids" });
  results.set(result.auctionId, result);
  console.log(`\n🏆 Winner: ${result.winnerId} at $${result.clearingPrice}`);

  try {
    // Settlement uses Circle Developer-Controlled Wallets (not Gateway) —
    // winner's DCW → seller's DCW on Arc Testnet.
    const txId = await transferUSDC(
      result.winnerAddress,
      result.sellerAddress,
      result.clearingPrice.toString()
    );
    const confirmed = await waitForTx(txId);
    const receipt: AuctionReceipt = {
      ...result,
      txHash: confirmed?.txHash,
      arcExplorer: `${config.arcExplorerUrl}/tx/${confirmed?.txHash}`,
      paidAt: new Date().toISOString(),
    };
    receipts.set(result.auctionId, receipt);
    pendingBids.set(listingId, []);
    listings.delete(listingId);
    res.json({ success: true, receipt });
  } catch (err: any) {
    console.error("Settlement error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/stats", (_, res) =>
  res.json({
    totalAuctions: results.size,
    totalReceipts: receipts.size,
    activeListings: listings.size,
    receipts: Array.from(receipts.values()),
  })
);

app.get("/health", (_, res) => res.json({ status: "ok", network: NETWORK }));

app.listen(config.port, () => {
  console.log(`🚀 Exchange running on http://localhost:${config.port}`);
  console.log(`   Seller EOA: ${SELLER_ADDRESS}`);
  console.log(`   Network:    ${NETWORK}`);
  console.log(`   Facilitator: ${FACILITATOR_URL}`);
});
