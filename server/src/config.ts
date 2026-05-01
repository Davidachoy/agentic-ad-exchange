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

const blankToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), schema);

const optionalAddr = blankToUndefined(
  z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
);
const optionalWalletId = blankToUndefined(z.string().min(1).optional());

const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4021),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
  CORS_ALLOW_ORIGINS: OriginListSchema.default("http://localhost:5173"),
  BID_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(120),
  ARC_CHAIN_ID: z.coerce.number().int().positive().default(ARC_TESTNET_CHAIN_ID),
  // Reason: blank strings from .env placeholders ("BUYER_WALLET_ID=") must be
  // treated as absent so the server starts without a funded wallet configured.
  BUYER_WALLET_ID: optionalWalletId,
  // Per-persona buyer wallets — when set, the auction route routes settlement
  // through the wallet whose address matches the winning bid's buyerWallet.
  // Falls back to BUYER_WALLET_ID when no persona match is found.
  BUYER_LUXURYCO_WALLET_ID: optionalWalletId,
  BUYER_LUXURYCO_WALLET_ADDRESS: optionalAddr,
  BUYER_GROWTHCO_WALLET_ID: optionalWalletId,
  BUYER_GROWTHCO_WALLET_ADDRESS: optionalAddr,
  BUYER_RETAILCO_WALLET_ID: optionalWalletId,
  BUYER_RETAILCO_WALLET_ADDRESS: optionalAddr,
  // Seller's EVM address — required for Gateway middleware to credit
  // payments and for the demo route as the listing payee.
  SELLER_WALLET_ADDRESS: optionalAddr,
  // EOA private key used by GatewayClient to sign x402 payment authorizations
  // in demo/script runs. Never logged or surfaced to the LLM layer.
  BUYER_PRIVATE_KEY: blankToUndefined(
    z
      .string()
      .regex(/^0x[a-fA-F0-9]{64}$/, "must be 0x-prefixed 64 hex chars")
      .optional(),
  ),
  // Override the Circle Gateway facilitator endpoint. Defaults to Arc testnet.
  GATEWAY_FACILITATOR_URL: blankToUndefined(z.string().url().optional()),
  // Demo deps for POST /demo/agent-run. Optional at startup; the route
  // returns 503 if any are missing when called.
  GEMINI_API_KEY: blankToUndefined(z.string().min(1).optional()),
  GEMINI_MODEL: blankToUndefined(z.string().min(1).default("gemini-2.5-flash")),
  MAX_CLEARING_PRICE_USDC: z
    .string()
    .regex(/^\d+(?:\.\d{1,6})?$/)
    .default(MAX_CLEARING_PRICE_USDC)
    .refine((v) => toAtomic(v) <= toAtomic(MAX_CLEARING_PRICE_USDC), {
      message: `must not exceed ${MAX_CLEARING_PRICE_USDC} USDC (hackathon ≤ $0.01/action rule)`,
    }),
  // "in_process" runs the in-server demo orchestrator (POST /demo/agent-run);
  // "external" expects standalone Railway agent services to drive auctions.
  // Default keeps `pnpm dev` behavior unchanged for local development.
  DEMO_MODE: z.enum(["in_process", "external"]).default("in_process"),
  // 0 disables the per-listing auto-clear timer (manual button only). Default
  // 8s fits comfortably inside the seller's 30s cadence so listings don't
  // overlap on the shared single-listing BidStore.
  AUCTION_AUTO_CLEAR_DELAY_MS: z.coerce.number().int().nonnegative().default(8000),
});

export type ServerConfig = z.infer<typeof ServerEnvSchema>;

/**
 * Map of lowercased buyer wallet address → Circle DCW wallet id. The auction
 * route consults this when settling: the winning bid's `buyerWallet` is
 * matched against the map to pick the funding wallet for the on-chain
 * transfer. Empty when no persona wallets are configured.
 */
export type BuyerWalletRouting = ReadonlyMap<string, string>;

export function buildBuyerWalletRouting(config: ServerConfig): BuyerWalletRouting {
  const m = new Map<string, string>();
  const pairs: Array<[string | undefined, string | undefined]> = [
    [config.BUYER_LUXURYCO_WALLET_ADDRESS, config.BUYER_LUXURYCO_WALLET_ID],
    [config.BUYER_GROWTHCO_WALLET_ADDRESS, config.BUYER_GROWTHCO_WALLET_ID],
    [config.BUYER_RETAILCO_WALLET_ADDRESS, config.BUYER_RETAILCO_WALLET_ID],
  ];
  for (const [addr, id] of pairs) {
    if (addr && id) m.set(addr.toLowerCase(), id);
  }
  return m;
}

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
