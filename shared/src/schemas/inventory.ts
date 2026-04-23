import { z } from "zod";

import {
  AdFormatSchema,
  AdSizeSchema,
  AdTypeSchema,
  IsoDateTimeSchema,
  UsdcAmountSchema,
  WalletAddressSchema,
} from "./primitives.js";

export const AdInventoryListingSchema = z.object({
  listingId: z.string().uuid(),
  sellerAgentId: z.string().min(1),
  sellerWallet: WalletAddressSchema,
  adType: AdTypeSchema,
  format: AdFormatSchema,
  size: AdSizeSchema,
  contextualExclusions: z.array(z.string()).default([]),
  floorPriceUsdc: UsdcAmountSchema,
  createdAt: IsoDateTimeSchema,
});
export type AdInventoryListing = z.infer<typeof AdInventoryListingSchema>;
