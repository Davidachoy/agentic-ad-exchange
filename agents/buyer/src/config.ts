import { config as loadDotenv } from "dotenv";
import { z } from "zod";

/**
 * Typed config for the buyer agent. Gemini key + Exchange URL + the wallet
 * id the agent bids on behalf of. Single reader of process.env for this package.
 */
const BuyerEnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-1.5-flash"),
  EXCHANGE_API_URL: z.string().url().default("http://localhost:4021"),
  BUYER_WALLET_ID: z.string().min(1),
});

export type BuyerAgentConfig = z.infer<typeof BuyerEnvSchema>;

export function loadBuyerConfig(env: NodeJS.ProcessEnv = process.env): BuyerAgentConfig {
  loadDotenv({ path: [".env.local", ".env"] });
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
