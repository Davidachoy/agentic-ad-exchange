import { UsdcAmountSchema, WalletAddressSchema } from "@ade/shared";
import { z } from "zod";

export const WalletRefSchema = z.object({
  walletId: z.string().min(1),
  address: WalletAddressSchema,
  blockchain: z.string().min(1),
});
export type WalletRef = z.infer<typeof WalletRefSchema>;

export const BalanceSnapshotSchema = z.object({
  walletId: z.string().min(1),
  usdc: UsdcAmountSchema,
  asOf: z.string().datetime({ offset: true }),
});
export type BalanceSnapshot = z.infer<typeof BalanceSnapshotSchema>;

export const TransactionRefSchema = z.object({
  transactionId: z.string().min(1),
  txHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/)
    .optional(),
  status: z.enum(["queued", "sent", "confirmed", "failed"]),
});
export type TransactionRef = z.infer<typeof TransactionRefSchema>;
