import { loadRootEnv } from "@ade/shared/env";
import { z } from "zod";

const SellerEnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  EXCHANGE_API_URL: z.string().url().default("http://localhost:4021"),
  // On-chain seller address embedded in every registered listing's
  // `sellerWallet`. Required by run.ts; no Circle DCW id needed because the
  // agent service does not settle — settlement happens server-side.
  SELLER_WALLET_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  SELLER_LISTING_INTERVAL_MS: z.coerce.number().int().positive().default(30_000),
});

export type SellerAgentConfig = z.infer<typeof SellerEnvSchema>;

export function loadSellerConfig(env: NodeJS.ProcessEnv = process.env): SellerAgentConfig {
  loadRootEnv();
  const parsed = SellerEnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      `Invalid seller-agent env: ${parsed.error.issues
        .map((i) => `${i.path.join(".")} ${i.message}`)
        .join("; ")}`,
    );
  }
  return parsed.data;
}
