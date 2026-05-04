import type {
  AdInventoryListing,
  AuctionResult,
  BidRequest,
  SettlementReceipt,
} from "@ade/shared";
import {
  AuctionResultSchema,
  GATEWAY_WALLET_ADDRESS,
  SettlementReceiptSchema,
} from "@ade/shared";
import type { Logger } from "pino";

import type { BidStore, ListingStore, SettlementStore } from "../state/stores.js";

/** Deterministic Arc-style tx hash (64 hex digits after 0x). */
function txHash(seed: number): `0x${string}` {
  const hex = seed.toString(16).padStart(64, "0");
  return `0x${hex.slice(-64)}` as `0x${string}`;
}

/** Deterministic EIP-3009 nonce (32 bytes hex). */
function nonce(seed: number): `0x${string}` {
  return txHash(seed + 10_000);
}

const SELLER = "0xcccccccccccccccccccccccccccccccccccccccc" as const;
const BUYER_A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
const BUYER_B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;

export const FIXTURE_LISTING_A = "11111111-1111-4111-8111-111111111101";
export const FIXTURE_LISTING_B = "11111111-1111-4111-8111-111111111102";

const BASE_TIME = "2026-05-01T14:00:00.000Z";

function isoPlusMinutes(m: number): string {
  const d = new Date(BASE_TIME);
  d.setUTCMinutes(d.getUTCMinutes() + m);
  return d.toISOString();
}

export function buildFixtureListings(): AdInventoryListing[] {
  return [
    {
      listingId: FIXTURE_LISTING_A,
      sellerAgentId: "seller-agent-demo",
      sellerWallet: SELLER,
      adType: "display",
      format: "banner",
      size: "300x250",
      contextualExclusions: [],
      floorPriceUsdc: "0.002000",
      createdAt: isoPlusMinutes(0),
    },
    {
      listingId: FIXTURE_LISTING_B,
      sellerAgentId: "seller-agent-demo",
      sellerWallet: SELLER,
      adType: "video",
      format: "pre-roll",
      size: "1920x1080",
      contextualExclusions: ["politics"],
      floorPriceUsdc: "0.003500",
      createdAt: isoPlusMinutes(5),
    },
  ];
}

const BID_IDS = [
  "22222222-2222-4222-a222-222222220101",
  "22222222-2222-4222-a222-222222220102",
  "22222222-2222-4222-a222-222222220103",
  "22222222-2222-4222-a222-222222220104",
] as const;

export function buildFixtureBids(): BidRequest[] {
  const mk = (i: number, agent: string, wallet: string, amount: string): BidRequest => ({
    bidId: BID_IDS[i - 1]!,
    buyerAgentId: agent,
    buyerWallet: wallet,
    targeting: {
      adType: "display",
      format: "banner",
      size: "300x250",
      contextTags: i % 2 === 0 ? ["luxury", "fashion"] : ["saas", "b2b"],
    },
    bidAmountUsdc: amount,
    budgetRemainingUsdc: "0.050000",
    nonce: nonce(100 + i),
    createdAt: isoPlusMinutes(10 + i),
  });
  return [
    mk(1, "buyer-luxuryco", BUYER_A, "0.005000"),
    mk(2, "buyer-growthco", BUYER_B, "0.004200"),
    mk(3, "buyer-retailco", BUYER_A, "0.006500"),
    mk(4, "buyer-luxuryco", BUYER_B, "0.004800"),
  ];
}

const RECEIPT_IDS = [
  "44444444-4444-4444-8444-444444440101",
  "44444444-4444-4444-8444-444444440102",
  "44444444-4444-4444-8444-444444440103",
  "44444444-4444-4444-8444-444444440104",
  "44444444-4444-4444-8444-444444440105",
  "44444444-4444-4444-8444-444444440106",
] as const;

/** Synthetic past auctions replayed over SSE so the feed populates on connect. */
export function buildFixtureAuctionReplay(): AuctionResult[] {
  const rows: AuctionResult[] = [
    {
      auctionId: "33333333-3333-4333-8333-333333333301",
      listingId: FIXTURE_LISTING_A,
      winningBidId: BID_IDS[0]!,
      winnerBuyerAgentId: "buyer-luxuryco",
      winnerBuyerWallet: BUYER_A,
      sellerAgentId: "seller-agent-demo",
      sellerWallet: SELLER,
      winningBidUsdc: "0.006500",
      clearingPriceUsdc: "0.004800",
      createdAt: isoPlusMinutes(30),
    },
    {
      auctionId: "33333333-3333-4333-8333-333333333302",
      listingId: FIXTURE_LISTING_A,
      winningBidId: BID_IDS[2]!,
      winnerBuyerAgentId: "buyer-retailco",
      winnerBuyerWallet: BUYER_A,
      sellerAgentId: "seller-agent-demo",
      sellerWallet: SELLER,
      winningBidUsdc: "0.006500",
      clearingPriceUsdc: "0.005000",
      createdAt: isoPlusMinutes(32),
    },
    {
      auctionId: "33333333-3333-4333-8333-333333333303",
      listingId: FIXTURE_LISTING_B,
      winningBidId: BID_IDS[1]!,
      winnerBuyerAgentId: "buyer-growthco",
      winnerBuyerWallet: BUYER_B,
      sellerAgentId: "seller-agent-demo",
      sellerWallet: SELLER,
      winningBidUsdc: "0.004200",
      clearingPriceUsdc: "0.003500",
      createdAt: isoPlusMinutes(40),
    },
    {
      auctionId: "33333333-3333-4333-8333-333333333304",
      listingId: FIXTURE_LISTING_A,
      winningBidId: BID_IDS[3]!,
      winnerBuyerAgentId: "buyer-luxuryco",
      winnerBuyerWallet: BUYER_B,
      sellerAgentId: "seller-agent-demo",
      sellerWallet: SELLER,
      winningBidUsdc: "0.008000",
      clearingPriceUsdc: "0.006500",
      createdAt: isoPlusMinutes(45),
    },
    {
      auctionId: "33333333-3333-4333-8333-333333333305",
      listingId: FIXTURE_LISTING_B,
      winningBidId: BID_IDS[0]!,
      winnerBuyerAgentId: "buyer-luxuryco",
      winnerBuyerWallet: BUYER_A,
      sellerAgentId: "seller-agent-demo",
      sellerWallet: SELLER,
      winningBidUsdc: "0.005000",
      clearingPriceUsdc: "0.004200",
      createdAt: isoPlusMinutes(50),
    },
    {
      auctionId: "33333333-3333-4333-8333-333333333306",
      listingId: FIXTURE_LISTING_A,
      winningBidId: BID_IDS[1]!,
      winnerBuyerAgentId: "buyer-growthco",
      winnerBuyerWallet: BUYER_B,
      sellerAgentId: "seller-agent-demo",
      sellerWallet: SELLER,
      winningBidUsdc: "0.007000",
      clearingPriceUsdc: "0.005500",
      createdAt: isoPlusMinutes(55),
    },
  ];
  for (const r of rows) {
    const p = AuctionResultSchema.safeParse(r);
    if (!p.success) throw new Error(`fixture auction invalid: ${p.error.message}`);
  }
  return rows;
}

export function buildFixtureReceipts(auctions: readonly AuctionResult[]): SettlementReceipt[] {
  const out: SettlementReceipt[] = auctions.map((a, i) => ({
    receiptId: RECEIPT_IDS[i]!,
    auctionId: a.auctionId,
    buyerWallet: a.winnerBuyerWallet,
    sellerWallet: a.sellerWallet,
    gatewayContract: GATEWAY_WALLET_ADDRESS,
    amountUsdc: a.clearingPriceUsdc,
    eip3009Nonce: nonce(200 + i),
    status: "confirmed" as const,
    arcTxHash: txHash(i + 1),
    arcLogIndex: i,
    createdAt: a.createdAt,
    confirmedAt: isoPlusMinutes(60 + i),
  }));
  for (const r of out) {
    const p = SettlementReceiptSchema.safeParse(r);
    if (!p.success) throw new Error(`fixture receipt invalid: ${p.error.message}`);
  }
  return out;
}

export interface SeedDevUiStoresInput {
  listingStore: ListingStore;
  bidStore: BidStore;
  settlementStore: SettlementStore;
  logger?: Logger;
}

/**
 * Loads deterministic listings, bids, and confirmed receipts into the in-memory
 * stores. Does not emit SSE (auction feed uses `fixtureAuctionReplay` in the
 * stream handshake so settlement counters stay aligned with GET /settlements).
 */
export async function seedDevUiStores(input: SeedDevUiStoresInput): Promise<void> {
  const listings = buildFixtureListings();
  const bids = buildFixtureBids();
  const auctions = buildFixtureAuctionReplay();
  const receipts = buildFixtureReceipts(auctions);

  for (const L of listings) await input.listingStore.add(L);
  for (const b of bids) await input.bidStore.add(b);
  for (const r of receipts) await input.settlementStore.add(r);

  input.logger?.info(
    { listings: listings.length, bids: bids.length, receipts: receipts.length },
    "ui_fixture_seed_stores_loaded",
  );
}
