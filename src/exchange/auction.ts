import type { Bid, InventoryListing, AuctionResult } from "../types/index.js";

// Second-price (Vickrey) auction: highest bid wins, pays second price + $0.0001
export function runSecondPriceAuction(
  listing: InventoryListing,
  bids: Bid[]
): AuctionResult | null {
  const eligible = bids.filter(
    (b) => b.amount >= listing.floorPrice && b.adType === listing.adType
  );

  if (eligible.length === 0) return null;

  eligible.sort((a, b) => b.amount - a.amount);

  const winner = eligible[0];
  const secondPrice = eligible.length >= 2 ? eligible[1].amount : listing.floorPrice;
  const clearingPrice = Math.round((secondPrice + 0.0001) * 1_000_000) / 1_000_000;

  return {
    auctionId: crypto.randomUUID(),
    listingId: listing.listingId,
    winnerId: winner.buyerId,
    winnerAddress: winner.walletAddress,
    winningBid: winner.amount,
    clearingPrice,
    sellerId: listing.sellerId,
    sellerAddress: listing.walletAddress,
    timestamp: Date.now(),
  };
}
