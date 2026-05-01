import { randomUUID } from "node:crypto";

import {
  AuctionResultSchema,
  GATEWAY_WALLET_ADDRESS,
  SettlementReceiptSchema,
  type AuctionResult,
  type SettlementReceipt,
} from "@ade/shared";
import type { CircleClient } from "@ade/wallets";

import type { EventBus } from "../events/bus.js";
import type { BidStore, ListingStore, SettlementStore } from "../state/stores.js";

import { matchBidsToListing } from "./match.js";
import { runSecondPriceAuction } from "./engine.js";

export interface RunAuctionDeps {
  listingStore: ListingStore;
  bidStore: BidStore;
  settlementStore: SettlementStore;
  eventBus: EventBus;
  /** null when Circle is not configured — settlement receipt is stored as "failed". */
  circleClient: CircleClient | null;
  buyerWalletId: string | undefined;
  /** Lowercased winner-address → walletId. Falls back to buyerWalletId if no match. */
  buyerWalletRouting?: ReadonlyMap<string, string>;
}

export type RunAuctionOutcome =
  | { kind: "listing_not_found" }
  | { kind: "no_eligible_bids" }
  | { kind: "settled"; auctionResult: AuctionResult; receipt: SettlementReceipt };

/**
 * Clear an auction for a single listing. Pure logic — no HTTP. Called from
 * both the manual route handler and the auto-clear scheduler.
 */
export async function runAuction(
  listingId: string,
  deps: RunAuctionDeps,
): Promise<RunAuctionOutcome> {
  const listing = await deps.listingStore.get(listingId);
  if (!listing) return { kind: "listing_not_found" };

  const allBids = await deps.bidStore.list();
  const matching = matchBidsToListing(listing, allBids);
  const engineOutput = runSecondPriceAuction({
    bids: matching,
    floorUsdc: listing.floorPriceUsdc,
  });

  if (!engineOutput) return { kind: "no_eligible_bids" };

  const { winner, clearingPriceUsdc } = engineOutput;
  // Drain after confirming a winner so bids are not lost on a 0-eligible miss.
  // Reason: BidStore is a flat queue shared across listings; the demo runs one
  // listing at a time so draining all bids is safe. Multi-listing support would
  // need per-listing queues.
  await deps.bidStore.drain();

  const auctionId = randomUUID();
  const now = new Date().toISOString();

  const auctionResult = AuctionResultSchema.parse({
    auctionId,
    listingId: listing.listingId,
    winningBidId: winner.bidId,
    winnerBuyerAgentId: winner.buyerAgentId,
    winnerBuyerWallet: winner.buyerWallet,
    sellerAgentId: listing.sellerAgentId,
    sellerWallet: listing.sellerWallet,
    winningBidUsdc: winner.bidAmountUsdc,
    clearingPriceUsdc,
    createdAt: now,
  });

  deps.eventBus.emit("auction.matched", auctionResult);

  const receiptBase = {
    receiptId: randomUUID(),
    auctionId,
    buyerWallet: winner.buyerWallet,
    sellerWallet: listing.sellerWallet,
    // Reason: DCW settlement path — x402 gateway not involved. GATEWAY_WALLET_ADDRESS
    // used as a sentinel so SettlementReceiptSchema (designed for EIP-3009) stays valid.
    gatewayContract: GATEWAY_WALLET_ADDRESS,
    amountUsdc: clearingPriceUsdc,
    // Reason: bid nonce reused as the settlement correlation handle on the DCW path
    // since there is no EIP-3009 authorization nonce on this path.
    eip3009Nonce: winner.nonce,
    createdAt: now,
  };

  // Pick the funding wallet: prefer per-persona routing by winner address,
  // fall back to the global pool walletId.
  const routedWalletId =
    deps.buyerWalletRouting?.get(winner.buyerWallet.toLowerCase()) ?? deps.buyerWalletId;

  let receipt: SettlementReceipt;
  if (!deps.circleClient || !routedWalletId) {
    receipt = SettlementReceiptSchema.parse({ ...receiptBase, status: "failed" });
  } else {
    try {
      const tx = await deps.circleClient.transfer({
        walletId: routedWalletId,
        destinationAddress: listing.sellerWallet,
        amountUsdc: clearingPriceUsdc,
      });
      const txReceipt = await deps.circleClient.waitForTx({
        transactionId: tx.transactionId,
      });
      receipt = SettlementReceiptSchema.parse({
        ...receiptBase,
        status: "confirmed",
        arcTxHash: txReceipt.txHash,
        confirmedAt: new Date().toISOString(),
      });
    } catch (settlementErr) {
      // TEMP: surface the swallowed Circle transfer error during demo bring-up.
      // eslint-disable-next-line no-console
      console.error("settlement_transfer_failed", {
        walletId: routedWalletId,
        destinationAddress: listing.sellerWallet,
        amountUsdc: clearingPriceUsdc,
        err: settlementErr,
      });
      receipt = SettlementReceiptSchema.parse({ ...receiptBase, status: "failed" });
    }
  }

  await deps.settlementStore.add(receipt);
  deps.eventBus.emit("settlement.confirmed", receipt);

  // Consume the listing on confirmed settlement so the seller's inventory
  // doesn't accumulate sold slots. Failed settlements leave the listing
  // in place so it can be re-auctioned without a fresh listInventory call.
  if (receipt.status === "confirmed") {
    await deps.listingStore.remove(listing.listingId);
  }

  return { kind: "settled", auctionResult, receipt };
}
