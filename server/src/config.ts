import { ARC_TESTNET_CHAIN_ID, MAX_CLEARING_PRICE_USDC } from "@ade/shared";
import { loadRootEnv } from "@ade/shared/env";
import { z } from "zod";

/**
 * Typed server config. The ONLY file that reads process.env in @ade/server.
 * Throws at startup on missing or malformed values.
 */
const OriginListSchema = z
  .string()
  .min(1)
  .refine((v) => !v.split(",").some((o) => o.trim() === "*"), {
    message: 'CORS_ALLOW_ORIGINS must not contain "*"',
  })
  .transform((v) =>
    v
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  );

const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4021),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
  CORS_ALLOW_ORIGINS: OriginListSchema.default("http://localhost:5173"),
  BID_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(120),
  ARC_CHAIN_ID: z.coerce.number().int().positive().default(ARC_TESTNET_CHAIN_ID),
  MAX_CLEARING_PRICE_USDC: z
    .string()
    .regex(/^\d+(?:\.\d{1,6})?$/)
    .default(MAX_CLEARING_PRICE_USDC)
    .refine((v) => toAtomic(v) <= toAtomic(MAX_CLEARING_PRICE_USDC), {
      message: `must not exceed ${MAX_CLEARING_PRICE_USDC} USDC (hackathon ≤ $0.01/action rule)`,
    }),
});

export type ServerConfig = z.infer<typeof ServerEnvSchema>;

export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  loadRootEnv();
  const parsed = ServerEnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      `Invalid server env: ${parsed.error.issues
        .map((i) => `${i.path.join(".")} ${i.message}`)
        .join("; ")}`,
    );
  }
  return parsed.data;
}

// Local atomic-unit helper — mirrors server/src/auction/money.ts. Duplicated
// here so the config refine can run before auction imports resolve.
function toAtomic(usdc: string): bigint {
  const [whole = "0", frac = ""] = usdc.split(".");
  const padded = (frac + "000000").slice(0, 6);
  return BigInt(whole) * 1_000_000n + BigInt(padded);
}
