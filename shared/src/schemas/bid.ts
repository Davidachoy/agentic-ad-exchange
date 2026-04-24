import { z } from "zod";

import {
  AdTargetingSchema,
  Eip3009NonceSchema,
  IsoDateTimeSchema,
  UsdcAmountSchema,
  WalletAddressSchema,
} from "./primitives.js";

export const BidRequestSchema = z.object({
  bidId: z.string().uuid(),
  buyerAgentId: z.string().min(1),
  buyerWallet: WalletAddressSchema,
  targeting: AdTargetingSchema,
  bidAmountUsdc: UsdcAmountSchema,
  budgetRemainingUsdc: UsdcAmountSchema,
  nonce: Eip3009NonceSchema,
  createdAt: IsoDateTimeSchema,
});
export type BidRequest = z.infer<typeof BidRequestSchema>;
