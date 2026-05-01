import { AdInventoryListingSchema, type AdInventoryListing } from "@ade/shared";

import type { BuyerAgent } from "./agent.js";
import { loadBuyerConfig, type BuyerAgentConfig } from "./config.js";

import { createBuyerAgentWithGemini } from "./index.js";

const sleep = (ms: number): Promise<void> => new Promise<void>((r) => setTimeout(r, ms));

function buildPrompt(config: BuyerAgentConfig, listing: AdInventoryListing): string {
  return [
    "Sealed-bid second-price auction. Other buyers will bid blind too.",
    "",
    `You are an autonomous buying agent for ${config.BUYER_AGENT_BRAND}.`,
    `Mission: ${config.BUYER_AGENT_STRATEGY}`,
    `Bid range: $${config.BUYER_AGENT_MIN_BID_USDC} – $${config.BUYER_AGENT_MAX_BID_USDC} USDC per impression.`,
    `Preferred tags: ${config.BUYER_AGENT_PREFERRED_TAGS.join(", ")}.`,
    "",
    `Listing #${listing.listingId.slice(0, 8)} — ${listing.format} ${listing.size}, floor $${listing.floorPriceUsdc}`,
    "",
    "Call placeBid with:",
    `- targeting.adType: "${listing.adType}"`,
    `- targeting.format: "${listing.format}"`,
    `- targeting.size: "${listing.size}"`,
    "- targeting.contextTags: choose the subset of your preferred tags that matches the listing.",
    `- bidAmountUsdc: a value within your range $${config.BUYER_AGENT_MIN_BID_USDC}–$${config.BUYER_AGENT_MAX_BID_USDC}.`,
    `- budgetRemainingUsdc: "1.000".`,
  ].join("\n");
}

export interface RunBuyerDeps {
  /** Override env-loaded config (tests). */
  config?: BuyerAgentConfig;
  /** Fetch override (tests). */
  fetchImpl?: typeof fetch;
  /** Inject a pre-built agent (tests); production builds via Gemini. */
  agent?: BuyerAgent;
  /** Bound the loop to N cycles. Tests pass a number; production omits. */
  maxCycles?: number;
  /** Sleep override (tests skip the wait). */
  sleepImpl?: (ms: number) => Promise<void>;
  /** Structured logger hook. Defaults to console.log with persona prefix. */
  log?: (msg: string, meta?: Record<string, unknown>) => void;
}

export interface RunBuyerResult {
  cycles: number;
  bids: number;
}

export async function runBuyer(deps: RunBuyerDeps = {}): Promise<RunBuyerResult> {
  const config = deps.config ?? loadBuyerConfig();
  const fetcher = deps.fetchImpl ?? fetch;
  const sleepFn = deps.sleepImpl ?? sleep;
  const log =
    deps.log ??
    ((msg: string, meta?: Record<string, unknown>) =>
      // eslint-disable-next-line no-console
      console.log(`[${config.BUYER_AGENT_ID}] ${msg}`, meta ?? {}));
  const agent = deps.agent ?? createBuyerAgentWithGemini({ config });
  const seenListings = new Set<string>();

  let cycles = 0;
  let bids = 0;

  while (deps.maxCycles === undefined || cycles < deps.maxCycles) {
    cycles++;
    try {
      const res = await fetcher(`${config.EXCHANGE_API_URL}/inventory`, { method: "GET" });
      if (!res.ok) {
        log("inventory_fetch_failed", { status: res.status });
      } else {
        const json = (await res.json()) as unknown;
        const items = Array.isArray(json) ? json : (json as { items?: unknown }).items;
        const listings = AdInventoryListingSchema.array().parse(items);
        const target = listings.find((l) => !seenListings.has(l.listingId));
        if (target) {
          const result = await agent.run(buildPrompt(config, target));
          // Reason: only mark seen after agent.run() returns. If it throws
          // (Gemini 503, network blip), the next cycle re-tries this listing
          // instead of permanently skipping it.
          seenListings.add(target.listingId);
          const placed = result.toolCalls.includes("placeBid");
          if (placed) bids++;
          log("cycle_done", {
            listingId: target.listingId,
            iterations: result.iterations,
            toolCalls: result.toolCalls,
            placed,
          });
        }
      }
    } catch (e) {
      log("cycle_error", { error: (e as Error).message });
    }
    await sleepFn(config.BUYER_POLL_INTERVAL_MS);
  }

  return { cycles, bids };
}

const isEntry =
  typeof process !== "undefined" &&
  typeof process.argv[1] === "string" &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isEntry) {
  runBuyer().catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error("[buyer:run] fatal:", err);
    process.exit(1);
  });
}
