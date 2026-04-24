import { z } from "zod";

/** EVM address — 0x-prefixed 40-hex. */
export const WalletAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "must be a 0x-prefixed 40-hex address");

/**
 * USDC amount encoded as decimal string with up to 6 fractional digits.
 * Keep string form through every boundary; convert to BigInt atomic units
 * only inside the auction / settlement engine.
 */
export const UsdcAmountSchema = z
  .string()
  .regex(/^\d+(?:\.\d{1,6})?$/, 'must be a decimal USDC amount like "0.005"');

/** 32-byte EIP-3009 nonce. */
export const Eip3009NonceSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "must be a 0x-prefixed 64-hex (32-byte) nonce");

/** RFC-3339 datetime string. */
export const IsoDateTimeSchema = z.string().datetime({ offset: true });

/** Ad geometry descriptor — "300x250", "728x90", etc. */
export const AdSizeSchema = z.string().regex(/^\d+x\d+$/, 'must be "WxH"');

export const AdTypeSchema = z.enum(["display", "video", "native"]);
export const AdFormatSchema = z.string().min(1);

export const AdTargetingSchema = z.object({
  adType: AdTypeSchema,
  format: AdFormatSchema,
  size: AdSizeSchema,
  contextTags: z.array(z.string()).default([]),
});
