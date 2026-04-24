import { z } from "zod";

// Reason: `FOO=` in a .env file is loaded by dotenv as the empty string, not
// as absent. Zod's `.optional()` only forgives `undefined`, so a blank line
// placeholder (e.g. `WALLET_SET_ID=`) would otherwise fail `.min(1)`. Treat
// blank strings as "not provided" at the boundary.
const blankToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    schema,
  );

/**
 * Typed config for @ade/wallets. The Circle entity secret and API key live
 * here and here only — no other file in this package reads process.env.
 * See CLAUDE.md § Security.
 */
const WalletsEnvSchema = z.object({
  CIRCLE_API_KEY: z.string().min(1, "CIRCLE_API_KEY is required"),
  CIRCLE_ENTITY_SECRET: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/, "CIRCLE_ENTITY_SECRET must be 32-byte hex (64 chars)"),
  CIRCLE_ENVIRONMENT: z.enum(["testnet", "mainnet"]).default("testnet"),
  WALLET_SET_ID: blankToUndefined(z.string().min(1).optional()),
});

export type WalletsConfig = z.infer<typeof WalletsEnvSchema>;

/**
 * Parse the env once. Throws on missing/malformed. Call at module load
 * from a server-side entry only — never from ui/.
 */
export function loadWalletsConfig(env: NodeJS.ProcessEnv = process.env): WalletsConfig {
  const parsed = WalletsEnvSchema.safeParse({
    CIRCLE_API_KEY: env.CIRCLE_API_KEY,
    CIRCLE_ENTITY_SECRET: env.CIRCLE_ENTITY_SECRET,
    CIRCLE_ENVIRONMENT: env.CIRCLE_ENVIRONMENT,
    WALLET_SET_ID: env.WALLET_SET_ID,
  });
  if (!parsed.success) {
    throw new Error(
      `Invalid Circle wallet config: ${parsed.error.issues
        .map((i) => `${i.path.join(".")} ${i.message}`)
        .join("; ")}`,
    );
  }
  return parsed.data;
}
