import { z } from "zod";

import {
  Eip3009NonceSchema,
  IsoDateTimeSchema,
  UsdcAmountSchema,
  WalletAddressSchema,
} from "./primitives.js";

export const SettlementStatusSchema = z.enum(["pending", "confirmed", "failed"]);
export type SettlementStatus = z.infer<typeof SettlementStatusSchema>;

export const SettlementReceiptSchema = z.object({
  receiptId: z.string().uuid(),
  auctionId: z.string().uuid(),
  buyerWallet: WalletAddressSchema,
  sellerWallet: WalletAddressSchema,
  gatewayContract: WalletAddressSchema,
  amountUsdc: UsdcAmountSchema,
  eip3009Nonce: Eip3009NonceSchema,
  status: SettlementStatusSchema,
  arcTxHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/)
    .optional(),
  arcLogIndex: z.number().int().nonnegative().optional(),
  createdAt: IsoDateTimeSchema,
  confirmedAt: IsoDateTimeSchema.optional(),
});
export type SettlementReceipt = z.infer<typeof SettlementReceiptSchema>;
