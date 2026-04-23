import { config as loadDotenv } from "dotenv";
import { z } from "zod";

/**
 * Single reader of process.env for @ade/scripts. Scripts inherit the same
 * Circle env as @ade/wallets but add deposit/faucet-specific keys.
 */
const ScriptsEnvSchema = z.object({
  CIRCLE_API_KEY: z.string().min(1),
  CIRCLE_ENTITY_SECRET: z.string().regex(/^[a-fA-F0-9]{64}$/),
  CIRCLE_ENVIRONMENT: z.enum(["testnet", "mainnet"]).default("testnet"),
  WALLET_SET_ID: z.string().min(1).optional(),
  BUYER_WALLET_ID: z.string().min(1).optional(),
  SELLER_WALLET_ID: z.string().min(1).optional(),
  MARKETPLACE_WALLET_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  DEPOSIT_AMOUNT_USDC: z
    .string()
    .regex(/^\d+(?:\.\d{1,6})?$/)
    .default("0.10"),
  ARC_CHAIN_ID: z.coerce.number().int().positive().optional(),
  ARC_RPC_URL: z.string().url().optional(),
});

export type ScriptsConfig = z.infer<typeof ScriptsEnvSchema>;

export function loadScriptsConfig(env: NodeJS.ProcessEnv = process.env): ScriptsConfig {
  loadDotenv({ path: [".env.local", ".env"] });
  const parsed = ScriptsEnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      `Invalid scripts env: ${parsed.error.issues
        .map((i) => `${i.path.join(".")} ${i.message}`)
        .join("; ")}`,
    );
  }
  return parsed.data;
}

/** Hard guard against accidental mainnet actions. */
export function assertTestnet(config: ScriptsConfig): void {
  if (config.CIRCLE_ENVIRONMENT !== "testnet") {
    const confirm = process.env.CONFIRM_MAINNET;
    if (confirm !== "yes") {
      throw new Error(
        "Refusing to run: CIRCLE_ENVIRONMENT is not 'testnet'. Set CONFIRM_MAINNET=yes to override.",
      );
    }
  }
}
