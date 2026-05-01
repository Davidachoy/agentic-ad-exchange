import { loadRootEnv } from "@ade/shared/env";
import { z } from "zod";

const PreferredTagsSchema = z
  .string()
  .min(1)
  .transform((v) =>
    v
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  );

const BuyerEnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  EXCHANGE_API_URL: z.string().url().default("http://localhost:4021"),
  // EOA private key for signing x402 payment authorizations via GatewayClient.
  // Never passed to the LLM — used only inside placeBid tool's network call.
  BUYER_PRIVATE_KEY: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, "must be 0x-prefixed 64 hex chars")
    .optional(),
  BUYER_CHAIN: z.string().min(1).default("arcTestnet"),

  // Persona binding for the standalone agent service (one process = one
  // persona). The on-chain address must match one of the server's
  // BUYER_LUXURYCO/GROWTHCO/RETAILCO_WALLET_ADDRESS entries, otherwise
  // settlement falls back to BUYER_WALLET_ID and persona attribution is lost.
  BUYER_AGENT_ID: z.string().min(1),
  BUYER_AGENT_BRAND: z.string().min(1),
  BUYER_AGENT_STRATEGY: z.string().min(1),
  BUYER_AGENT_MAX_BID_USDC: z.string().regex(/^\d+(?:\.\d{1,6})?$/),
  BUYER_AGENT_MIN_BID_USDC: z.string().regex(/^\d+(?:\.\d{1,6})?$/),
  BUYER_AGENT_PREFERRED_TAGS: PreferredTagsSchema,
  BUYER_WALLET_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  BUYER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
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
