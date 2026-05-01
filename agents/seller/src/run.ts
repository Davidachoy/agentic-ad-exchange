import type { SellerAgent } from "./agent.js";
import { loadSellerConfig, type SellerAgentConfig } from "./config.js";

import { createSellerAgentWithGemini } from "./index.js";

interface ListingTemplate {
  vertical: string;
  description: string;
  contextTags: ReadonlyArray<string>;
  floorUsdc: string;
}

// Reason: duplicate of server/src/demo/runAgentAuction.ts:109-134 LISTING_TEMPLATES.
// Demo-fixture data, not business logic — duplication is acceptable per PRP
// "Out of Scope" item #4. Extracting to @ade/shared is a separate ticket.
const LISTING_TEMPLATES: ReadonlyArray<ListingTemplate> = [
  {
    vertical: "premium-fashion",
    description: "premium fashion magazine homepage banner (luxury cohort)",
    contextTags: ["luxury", "fashion", "premium"],
    floorUsdc: "0.003",
  },
  {
    vertical: "dev-news",
    description: "developer news site sidebar (B2B/SaaS cohort)",
    contextTags: ["tech", "developer", "saas"],
    floorUsdc: "0.002",
  },
  {
    vertical: "retail-checkout",
    description: "retail site checkout interstitial (high-intent buyers)",
    contextTags: ["retail", "ecommerce", "shopping", "checkout-intent"],
    floorUsdc: "0.003",
  },
  {
    vertical: "general-news",
    description: "general news site banner (mixed/low-intent cohort)",
    contextTags: ["news", "general"],
    floorUsdc: "0.001",
  },
];

const sleep = (ms: number): Promise<void> => new Promise<void>((r) => setTimeout(r, ms));

function buildPrompt(template: ListingTemplate): string {
  return [
    "Register a new ad slot via the listInventory tool.",
    "",
    "Listing parameters (use these exact values):",
    `- adType: "display"`,
    `- format: "banner"`,
    `- size: "300x250"`,
    `- floorPriceUsdc: "${template.floorUsdc}"`,
    `- contextualExclusions: []`,
    "",
    `Vertical: ${template.vertical} — ${template.description}.`,
    "After listInventory returns, output ONE short sentence confirming the registration.",
  ].join("\n");
}

export interface RunSellerDeps {
  /** Override env-loaded config (tests). */
  config?: SellerAgentConfig;
  /** Inject a pre-built agent (tests); production builds via Gemini. */
  agent?: SellerAgent;
  /** Bound the loop to N cycles. Tests pass a number; production omits. */
  maxCycles?: number;
  /** Sleep override (tests skip the wait). */
  sleepImpl?: (ms: number) => Promise<void>;
  /** Structured logger hook. */
  log?: (msg: string, meta?: Record<string, unknown>) => void;
  /** Capture the prompt sent to the agent each cycle (tests). */
  onPrompt?: (prompt: string) => void;
}

export interface RunSellerResult {
  cycles: number;
  registered: number;
}

export async function runSeller(deps: RunSellerDeps = {}): Promise<RunSellerResult> {
  const config = deps.config ?? loadSellerConfig();
  const sleepFn = deps.sleepImpl ?? sleep;
  const log =
    deps.log ??
    ((msg: string, meta?: Record<string, unknown>) =>
      // eslint-disable-next-line no-console
      console.log(`[seller-default] ${msg}`, meta ?? {}));
  const agent = deps.agent ?? createSellerAgentWithGemini({ config });

  let cycles = 0;
  let registered = 0;

  while (deps.maxCycles === undefined || cycles < deps.maxCycles) {
    const template = LISTING_TEMPLATES[cycles % LISTING_TEMPLATES.length]!;
    cycles++;
    try {
      const prompt = buildPrompt(template);
      deps.onPrompt?.(prompt);
      const result = await agent.run(prompt);
      const ok = result.toolCalls.includes("listInventory");
      if (ok) registered++;
      log("cycle_done", { vertical: template.vertical, ok, iterations: result.iterations });
    } catch (e) {
      log("cycle_error", { error: (e as Error).message });
    }
    await sleepFn(config.SELLER_LISTING_INTERVAL_MS);
  }

  return { cycles, registered };
}

const isEntry =
  typeof process !== "undefined" &&
  typeof process.argv[1] === "string" &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isEntry) {
  runSeller().catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error("[seller:run] fatal:", err);
    process.exit(1);
  });
}
