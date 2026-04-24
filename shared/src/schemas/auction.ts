import { z } from "zod";

import { IsoDateTimeSchema, UsdcAmountSchema, WalletAddressSchema } from "./primitives.js";

export const AuctionResultSchema = z.object({
  auctionId: z.string().uuid(),
  listingId: z.string().uuid(),
  winningBidId: z.string().uuid(),
  winnerBuyerAgentId: z.string().min(1),
  winnerBuyerWallet: WalletAddressSchema,
  sellerAgentId: z.string().min(1),
  sellerWallet: WalletAddressSchema,
  winningBidUsdc: UsdcAmountSchema,
  clearingPriceUsdc: UsdcAmountSchema,
  createdAt: IsoDateTimeSchema,
});
export type AuctionResult = z.infer<typeof AuctionResultSchema>;
