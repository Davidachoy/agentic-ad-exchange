import { runSecondPriceAuction } from "../src/exchange/index.js";

const listing = {
  listingId: "1",
  sellerId: "seller1",
  walletAddress: "0x123",
  adType: "banner",
  adFormat: "display",
  floorPrice: 0.001,
};

const bids = [
  {
    bidId: "1",
    buyerId: "buyer1",
    walletAddress: "0xabc",
    adType: "banner",
    adFormat: "display",
    amount: 0.007,
    timestamp: Date.now(),
  },
  {
    bidId: "2",
    buyerId: "buyer2",
    walletAddress: "0xdef",
    adType: "banner",
    adFormat: "display",
    amount: 0.005,
    timestamp: Date.now(),
  },
];

const result = runSecondPriceAuction(listing, bids);
console.log("Auction result:", JSON.stringify(result, null, 2));
