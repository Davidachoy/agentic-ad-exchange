import { loadRootEnv } from "@ade/shared/env";
import { z } from "zod";

// Reason: `FOO=` in a .env file is loaded by dotenv as the empty string, not
// as absent. Zod's `.optional()` only forgives `undefined`, so a blank line
// placeholder (e.g. `WALLET_SET_ID=`) would otherwise fail `.min(1)` / `.url()` /
// `.regex()` checks. We treat blank strings as "not provided" at the boundary.
const blankToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    schema,
  );

/**
 * Single reader of process.env for @ade/scripts. Scripts inherit the same
 * Circle env as @ade/wallets but add deposit/faucet-specific keys.
 */
const ScriptsEnvSchema = z.object({
  CIRCLE_API_KEY: z.string().min(1),
  CIRCLE_ENTITY_SECRET: z.string().regex(/^[a-fA-F0-9]{64}$/),
  CIRCLE_ENVIRONMENT: z.enum(["testnet", "mainnet"]).default("testnet"),
  WALLET_SET_ID: blankToUndefined(z.string().min(1).optional()),
  BUYER_WALLET_ID: blankToUndefined(z.string().min(1).optional()),
  SELLER_WALLET_ID: blankToUndefined(z.string().min(1).optional()),
  MARKETPLACE_WALLET_ADDRESS: blankToUndefined(
    z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .optional(),
  ),
  DEPOSIT_AMOUNT_USDC: blankToUndefined(
    z
      .string()
      .regex(/^\d+(?:\.\d{1,6})?$/)
      .default("0.10"),
  ),
  ARC_CHAIN_ID: blankToUndefined(z.coerce.number().int().positive().optional()),
  ARC_RPC_URL: blankToUndefined(z.string().url().optional()),
});

export type ScriptsConfig = z.infer<typeof ScriptsEnvSchema>;

export function loadScriptsConfig(env: NodeJS.ProcessEnv = process.env): ScriptsConfig {
  loadRootEnv();
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
