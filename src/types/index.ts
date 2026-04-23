export interface Bid {
  bidId: string;
  buyerId: string;
  walletAddress: string;
  adType: string;
  adFormat: string;
  amount: number; // USDC
  timestamp: number;
}

export interface InventoryListing {
  listingId: string;
  sellerId: string;
  walletAddress: string;
  adType: string;
  adFormat: string;
  floorPrice: number; // minimum acceptable in USDC
}

export interface AuctionResult {
  auctionId: string;
  listingId: string;
  winnerId: string;
  winnerAddress: string;
  winningBid: number;
  clearingPrice: number; // what the winner actually pays
  sellerId: string;
  sellerAddress: string;
  timestamp: number;
}

export interface AuctionReceipt extends AuctionResult {
  txHash: string | undefined;
  arcExplorer: string;
  paidAt: string;
}
