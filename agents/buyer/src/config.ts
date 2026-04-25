import { loadRootEnv } from "@ade/shared/env";
import { z } from "zod";

const BuyerEnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  EXCHANGE_API_URL: z.string().url().default("http://localhost:4021"),
  BUYER_WALLET_ID: z.string().min(1),
  // EOA private key for signing x402 payment authorizations via GatewayClient.
  // Never passed to the LLM — used only inside placeBid tool's network call.
  BUYER_PRIVATE_KEY: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, "must be 0x-prefixed 64 hex chars")
    .optional(),
  BUYER_CHAIN: z.string().min(1).default("arcTestnet"),
});

export type BuyerAgentConfig = z.infer<typeof BuyerEnvSchema>;

export function loadBuyerConfig(env: NodeJS.ProcessEnv = process.env): BuyerAgentConfig {
  loadRootEnv();
  const parsed = BuyerEnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      `Invalid buyer-agent env: ${parsed.error.issues
        .map((i) => `${i.path.join(".")} ${i.message}`)
        .join("; ")}`,
    );
  }
  return parsed.data;
}
