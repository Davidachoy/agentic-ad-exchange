import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { FLOOR_PRICE_MIN_USDC, MAX_CLEARING_PRICE_USDC } from "@ade/shared";
import { createCircleClient, type CircleClient } from "@ade/wallets";

import { assertTestnet, loadScriptsConfig, type ScriptsConfig } from "./config.js";
import { runDemoCycle, type DemoCycleResult } from "./demoLoad.cycle.js";
import { buildMarginExplainer } from "./demoLoad.margin.js";
import { banner, log } from "./logger.js";

const USDC_UNITS = 1_000_000n;
/** Buffer above the theoretical max (`cycles × cap`) so a 50-cycle run isn't
 * blocked by a dust shortfall on the buyer DCW. */
const PREFLIGHT_HEADROOM_USDC = "0.050000" as const;

/**
 * One row of the manifest written to `scripts/.demo-output/settlements.json`.
 * Producer (writeSettlementManifest) and consumer (judges, the demo video
 * narration) are both inside this repo — a zod schema would be overkill.
 */
export interface SettlementManifestEntry {
  cycle: number;
  txHash: string;
  explorerUrl: string;
  clearingPrice: string;
  status: string;
}

export interface DemoLoadDeps {
  config?: ScriptsConfig;
  /** Used only for the preflight balance check; the cycle itself goes through HTTP. */
  client?: CircleClient;
  floorUsdc?: string;
  rand?: () => number;
  logLine?: (msg: string, meta?: Record<string, unknown>) => void;
  /**
   * Override the manifest writer for tests. Defaults to writing to
   * `scripts/.demo-output/settlements.json`. Tests inject a spy so they
   * don't have to mock node:fs.
   */
  writeManifest?: (results: DemoCycleResult[]) => Promise<void>;
}

export interface DemoLoadResult {
  cycles: number;
  totalUsdcSettled: string;
  results: DemoCycleResult[];
}

export async function runDemoLoad(deps: DemoLoadDeps = {}): Promise<DemoLoadResult> {
  const config = deps.config ?? loadScriptsConfig();
  assertTestnet(config);

  const { BUYER_WALLET_ID, BUYER_WALLET_ADDRESS, SELLER_WALLET_ADDRESS } = config;
  if (!BUYER_WALLET_ID || !BUYER_WALLET_ADDRESS || !SELLER_WALLET_ADDRESS) {
    throw new Error(
      "Missing wallet env vars. demoLoad requires BUYER_WALLET_ID, BUYER_WALLET_ADDRESS, SELLER_WALLET_ADDRESS — run create:wallets and copy the banner into .env.local.",
    );
  }

  const cycles = config.DEMO_LOAD_CYCLES;
  const floorUsdc = deps.floorUsdc ?? FLOOR_PRICE_MIN_USDC;
  const exchangeApiUrl = config.EXCHANGE_API_URL ?? "http://localhost:4021";
  const client = deps.client ?? createCircleClient({ env: process.env });
  const logLine = deps.logLine ?? log;
  const writeManifest = deps.writeManifest ?? defaultWriteManifest;

  // Preflight: verify buyer balance covers all cycles before starting.
  const balance = await client.getBalance(BUYER_WALLET_ID);
  const requiredAtomic =
    toAtomic(MAX_CLEARING_PRICE_USDC) * BigInt(cycles) + toAtomic(PREFLIGHT_HEADROOM_USDC);
  if (toAtomic(balance.usdc) < requiredAtomic) {
    throw new Error(
      `Buyer balance ${balance.usdc} USDC is below the ${fromAtomic(requiredAtomic)} USDC required for ${cycles} cycles. Run fund:wallets and retry.`,
    );
  }

  // Register a demo listing so the auction route has a listing to match bids against.
  const listingId = await registerDemoListing({
    exchangeApiUrl,
    sellerWallet: SELLER_WALLET_ADDRESS,
    floorUsdc,
  });

  banner("Demo Load — starting", [
    `Cycles: ${cycles}  (≥ 50 satisfies hackathon gate)`,
    `Exchange: ${exchangeApiUrl}`,
    `Buyer: ${BUYER_WALLET_ADDRESS}`,
    `Seller: ${SELLER_WALLET_ADDRESS}`,
    `Floor: ${floorUsdc} USDC   Cap: ${MAX_CLEARING_PRICE_USDC} USDC/action`,
  ]);

  const results: DemoCycleResult[] = [];
  let totalAtomic = 0n;
  for (let i = 1; i <= cycles; i++) {
    const result = await runDemoCycle({
      exchangeApiUrl,
      listingId,
      buyerAddress: BUYER_WALLET_ADDRESS,
      floorUsdc,
      rand: deps.rand,
    });
    results.push(result);
    totalAtomic += toAtomic(result.clearingPrice);
    logLine(`[${i}/${cycles}] tx=${result.txHash}`, {
      clearingUsdc: result.clearingPrice,
      status: result.status,
      explorer: result.explorerUrl,
    });
  }

  if (results.length < cycles) {
    throw new Error(
      `Demo load produced ${results.length}/${cycles} transactions — hackathon gate not met`,
    );
  }

  await writeManifest(results);

  const totalUsdcSettled = fromAtomic(totalAtomic);
  banner(
    "Demo Load — complete",
    buildMarginExplainer({ cycles: results.length, totalUsdcSettled }),
  );
  return { cycles: results.length, totalUsdcSettled, results };
}

/**
 * Default manifest writer: emits `scripts/.demo-output/settlements.json` with
 * one entry per cycle (including failed ones, so the count matches
 * DEMO_LOAD_CYCLES exactly). The directory is gitignored.
 */
async function defaultWriteManifest(results: DemoCycleResult[]): Promise<void> {
  const dir = path.resolve(process.cwd(), "scripts", ".demo-output");
  await fs.mkdir(dir, { recursive: true });
  const entries: SettlementManifestEntry[] = results.map((r, i) => ({
    cycle: i + 1,
    txHash: r.txHash,
    explorerUrl: r.explorerUrl,
    clearingPrice: r.clearingPrice,
    status: r.status,
  }));
  const out = path.join(dir, "settlements.json");
  await fs.writeFile(out, JSON.stringify(entries, null, 2) + "\n", "utf8");
  log(`Wrote ${entries.length} settlements → scripts/.demo-output/settlements.json`);
}

async function registerDemoListing(opts: {
  exchangeApiUrl: string;
  sellerWallet: string;
  floorUsdc: string;
}): Promise<string> {
  const listingId = randomUUID();
  const res = await fetch(`${opts.exchangeApiUrl}/inventory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      listingId,
      sellerAgentId: "demo-seller",
      sellerWallet: opts.sellerWallet,
      adType: "display",
      format: "banner",
      size: "300x250",
      contextualExclusions: [],
      floorPriceUsdc: opts.floorUsdc,
      createdAt: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(`Failed to register demo listing: ${res.status} ${JSON.stringify(body)}`);
  }
  return listingId;
}

function toAtomic(usdc: string): bigint {
  const [whole = "0", frac = ""] = usdc.split(".");
  const padded = (frac + "000000").slice(0, 6);
  return BigInt(whole) * USDC_UNITS + BigInt(padded);
}

function fromAtomic(atomic: bigint): string {
  const whole = atomic / USDC_UNITS;
  const frac = atomic % USDC_UNITS;
  return `${whole.toString()}.${frac.toString().padStart(6, "0")}`;
}

const isEntry =
  typeof process !== "undefined" &&
  typeof process.argv[1] === "string" &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isEntry) {
  runDemoLoad().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
