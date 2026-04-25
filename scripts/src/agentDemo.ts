import { randomBytes, randomUUID } from "node:crypto";

import {
  createBuyerAgent,
  createCheckBalanceTool,
  createGeminiLlmAdapter,
  createPlaceBidTool,
  createReviewAuctionTool,
  loadBuyerConfig,
  type AgentTool as BuyerAgentTool,
  type BuyerAgent,
} from "@ade/agent-buyer";
import { createSellerAgentWithGemini } from "@ade/agent-seller";
import { createCircleClient } from "@ade/wallets";

import { loadScriptsConfig, type ScriptsConfig } from "./config.js";
import { banner, log } from "./logger.js";

/**
 * Multi-agent auction orchestrator. Three buyer agents with distinct personas
 * and strategies bid in parallel against a single seller listing. Each buyer
 * runs its own Gemini chat session and decides bid amount based on context
 * match — no orchestrator-supplied bid value. The auction sees the resulting
 * spread and settles via second-price.
 */

interface BuyerPersona {
  agentId: string;
  brand: string;
  walletAddress: string;
  walletId: string;
  strategy: string;
  maxBid: string;
  minBid: string;
  preferredTags: ReadonlyArray<string>;
}

interface PersonaTemplate {
  agentId: string;
  brand: string;
  strategy: string;
  maxBid: string;
  minBid: string;
  preferredTags: ReadonlyArray<string>;
  envWalletId: keyof Pick<
    ScriptsConfig,
    "BUYER_LUXURYCO_WALLET_ID" | "BUYER_GROWTHCO_WALLET_ID" | "BUYER_RETAILCO_WALLET_ID"
  >;
  envWalletAddr: keyof Pick<
    ScriptsConfig,
    | "BUYER_LUXURYCO_WALLET_ADDRESS"
    | "BUYER_GROWTHCO_WALLET_ADDRESS"
    | "BUYER_RETAILCO_WALLET_ADDRESS"
  >;
}

const PERSONA_TEMPLATES: ReadonlyArray<PersonaTemplate> = [
  {
    agentId: "buyer-luxuryco",
    brand: "LuxuryCo (premium fashion brand awareness)",
    strategy:
      "Brand awareness for high-CPM premium audiences. Pay up for luxury contexts; pull back hard on commodity inventory.",
    maxBid: "0.009",
    minBid: "0.003",
    preferredTags: ["luxury", "fashion", "premium", "high-income"],
    envWalletId: "BUYER_LUXURYCO_WALLET_ID",
    envWalletAddr: "BUYER_LUXURYCO_WALLET_ADDRESS",
  },
  {
    agentId: "buyer-growthco",
    brand: "GrowthCo (B2B SaaS performance marketing)",
    strategy:
      "ROAS-optimized. Strict CPM caps. Pay near max only for developer/SaaS contexts where conversion likelihood is high.",
    maxBid: "0.005",
    minBid: "0.002",
    preferredTags: ["tech", "saas", "b2b", "developer"],
    envWalletId: "BUYER_GROWTHCO_WALLET_ID",
    envWalletAddr: "BUYER_GROWTHCO_WALLET_ADDRESS",
  },
  {
    agentId: "buyer-retailco",
    brand: "RetailCo (e-commerce retargeting)",
    strategy:
      "Dynamic CPM by intent signal. Top dollar for cart-abandoner cohorts; floor-only for cold traffic.",
    maxBid: "0.008",
    minBid: "0.002",
    preferredTags: ["retail", "ecommerce", "shopping", "checkout-intent"],
    envWalletId: "BUYER_RETAILCO_WALLET_ID",
    envWalletAddr: "BUYER_RETAILCO_WALLET_ADDRESS",
  },
];

function resolvePersonas(config: ScriptsConfig): BuyerPersona[] {
  const out: BuyerPersona[] = [];
  for (const t of PERSONA_TEMPLATES) {
    const walletId = config[t.envWalletId];
    const walletAddress = config[t.envWalletAddr];
    if (!walletId || !walletAddress) {
      throw new Error(
        `Persona ${t.agentId}: ${t.envWalletId} and ${t.envWalletAddr} must be set in .env.local. Run create:wallets and copy the values in.`,
      );
    }
    out.push({
      agentId: t.agentId,
      brand: t.brand,
      walletAddress,
      walletId,
      strategy: t.strategy,
      maxBid: t.maxBid,
      minBid: t.minBid,
      preferredTags: t.preferredTags,
    });
  }
  return out;
}

interface ListingTemplate {
  vertical: string;
  description: string;
  contextTags: ReadonlyArray<string>;
  floorUsdc: string;
}

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

function nonce(): string {
  return "0x" + randomBytes(32).toString("hex");
}

function pickListingTemplate(): ListingTemplate {
  const i = Math.floor(Math.random() * LISTING_TEMPLATES.length);
  return LISTING_TEMPLATES[i]!;
}

function buildBuyerAgent(
  persona: BuyerPersona,
  cfg: { apiKey: string; model: string; exchangeUrl: string },
): BuyerAgent {
  const tools: BuyerAgentTool<unknown, unknown>[] = [
    createPlaceBidTool({ exchangeUrl: cfg.exchangeUrl }),
    createCheckBalanceTool({ exchangeUrl: cfg.exchangeUrl }),
    createReviewAuctionTool({ exchangeUrl: cfg.exchangeUrl }),
  ];
  const llm = createGeminiLlmAdapter({
    apiKey: cfg.apiKey,
    model: cfg.model,
    tools,
  });
  const systemPrompt = [
    `You are an autonomous buying agent operating on behalf of ${persona.brand}.`,
    "",
    `Mission: ${persona.strategy}`,
    `Bid range: $${persona.minBid} – $${persona.maxBid} USDC per impression.`,
    `Preferred context tags: ${persona.preferredTags.join(", ")}.`,
    "",
    "Decision policy:",
    " - Strong tag overlap (≥2 of your preferred tags appear in the listing) → bid near your max.",
    " - Partial overlap (1 tag) → bid mid-range.",
    " - No overlap → bid at your min, exploring the cohort.",
    "",
    "Hard rules:",
    "1. Place exactly ONE bid via the placeBid tool, then stop.",
    "2. Bid amount must respect your range and the listing floor (never below floor).",
    "3. Use the exact bidId, buyerWallet, nonce, and createdAt values from the user message verbatim.",
    "4. Set targeting.contextTags to the subset of YOUR preferred tags that overlap with the listing.",
    "5. After placeBid returns, output ONE short sentence: 'Bid $X.XXX — <reasoning>'.",
  ].join("\n");
  return createBuyerAgent({ llm, tools, systemPrompt });
}

interface BidContext {
  bidId: string;
  nonce: string;
  createdAt: string;
}

interface ListingForBuyers {
  listingId: string;
  floor: string;
  tags: ReadonlyArray<string>;
  description: string;
}

function buildBuyerPrompt(
  persona: BuyerPersona,
  listing: ListingForBuyers,
  ctx: BidContext,
): string {
  return [
    "Sealed-bid second-price auction. Other buyers will bid blind too.",
    "",
    `Listing: ${listing.description}`,
    `- listingId: ${listing.listingId}`,
    `- format: banner 300x250 display`,
    `- floorPriceUsdc: $${listing.floor}`,
    `- contextTags (supply-side data): ${listing.tags.join(", ")}`,
    "",
    `Compare these tags against your preferred tags (${persona.preferredTags.join(", ")}) and decide bidAmountUsdc.`,
    "",
    "Required exact values for placeBid:",
    `- bidId: "${ctx.bidId}"`,
    `- buyerAgentId: "${persona.agentId}"`,
    `- buyerWallet: "${persona.walletAddress}"`,
    `- nonce: "${ctx.nonce}"`,
    `- createdAt: "${ctx.createdAt}"`,
    `- budgetRemainingUsdc: "1.000"`,
    `- targeting.adType: "display"`,
    `- targeting.format: "banner"`,
    `- targeting.size: "300x250"`,
    "Set targeting.contextTags yourself to the matching subset.",
    "Set bidAmountUsdc yourself based on your strategy + match quality.",
  ].join("\n");
}

interface BuyerRunResult {
  persona: BuyerPersona;
  output: string;
  toolCalls: ReadonlyArray<string>;
  iterations: number;
  bidId: string;
}

async function runBuyerWithPersona(
  persona: BuyerPersona,
  agent: BuyerAgent,
  listing: ListingForBuyers,
): Promise<BuyerRunResult> {
  const ctx: BidContext = {
    bidId: randomUUID(),
    nonce: nonce(),
    createdAt: new Date().toISOString(),
  };
  const result = await agent.run(buildBuyerPrompt(persona, listing, ctx));
  return { persona, ...result, bidId: ctx.bidId };
}

async function runOnce(): Promise<void> {
  const config = loadScriptsConfig();
  const exchangeUrl = config.EXCHANGE_API_URL ?? "http://localhost:4021";
  const sellerWallet = config.SELLER_WALLET_ADDRESS;
  if (!sellerWallet) {
    throw new Error("agent:demo requires SELLER_WALLET_ADDRESS in .env.local");
  }

  const health = await fetch(`${exchangeUrl}/health`).catch(() => null);
  if (!health || !health.ok) {
    throw new Error(
      `Exchange not reachable at ${exchangeUrl}/health. Run: pnpm --filter @ade/server dev`,
    );
  }

  const personas = resolvePersonas(config);
  const buyerCfg = loadBuyerConfig();
  const listingTpl = pickListingTemplate();

  // Preflight: report each persona's USDC balance so the user knows which
  // wallets need a faucet top-up before the auction settles.
  const circle = createCircleClient({ env: process.env });
  const balances = await Promise.all(
    personas.map(async (p) => {
      try {
        const b = await circle.getBalance(p.walletId);
        return { agentId: p.agentId, address: p.walletAddress, usdc: b.usdc };
      } catch (e) {
        return {
          agentId: p.agentId,
          address: p.walletAddress,
          usdc: `ERR ${(e as Error).message}`,
        };
      }
    }),
  );

  banner("Multi-Agent Auction — starting", [
    `Listing vertical: ${listingTpl.vertical}`,
    `Listing tags: ${listingTpl.contextTags.join(", ")}`,
    `Floor: $${listingTpl.floorUsdc} USDC`,
    `Buyers competing: ${personas.length} (per-persona Circle DCWs)`,
    "",
    "Persona balances:",
    ...balances.map(
      (b) => `  ${b.agentId.padEnd(16)} ${b.address.slice(0, 10)}…  ${b.usdc} USDC`,
    ),
  ]);

  // ── Step 1: seller agent registers the listing ──────────────────────────
  const listingId = randomUUID();
  const sellerNow = new Date().toISOString();
  const sellerPrompt = [
    "Register a new ad inventory listing on the Exchange.",
    `Inventory description: ${listingTpl.description}`,
    "Use the listInventory tool ONCE with EXACTLY these field values:",
    `- listingId: "${listingId}"`,
    `- sellerAgentId: "seller-${listingTpl.vertical}"`,
    `- sellerWallet: "${sellerWallet}"`,
    `- adType: "display"`,
    `- format: "banner"`,
    `- size: "300x250"`,
    `- contextualExclusions: []`,
    `- floorPriceUsdc: "${listingTpl.floorUsdc}"`,
    `- createdAt: "${sellerNow}"`,
  ].join("\n");

  log("[seller] invoking Gemini…");
  const seller = createSellerAgentWithGemini();
  const sellerResult = await seller.run(sellerPrompt);
  if (!sellerResult.toolCalls.includes("listInventory")) {
    throw new Error("Seller agent did not call listInventory");
  }
  log(
    `[seller] iter=${sellerResult.iterations} tools=[${sellerResult.toolCalls.join(", ")}] · ${sellerResult.output}`,
  );

  // ── Step 2: buyers compete in parallel ──────────────────────────────────
  const listingForBuyers: ListingForBuyers = {
    listingId,
    floor: listingTpl.floorUsdc,
    tags: listingTpl.contextTags,
    description: listingTpl.description,
  };

  log(`[buyers] launching ${personas.length} agents in parallel…`);
  const buyers = personas.map((p) =>
    buildBuyerAgent(p, {
      apiKey: buyerCfg.GEMINI_API_KEY,
      model: buyerCfg.GEMINI_MODEL,
      exchangeUrl,
    }),
  );
  const settled = await Promise.allSettled(
    personas.map((p, i) => runBuyerWithPersona(p, buyers[i]!, listingForBuyers)),
  );

  const placed: BuyerRunResult[] = [];
  for (let i = 0; i < settled.length; i++) {
    const r = settled[i]!;
    const persona = personas[i]!;
    if (r.status === "fulfilled") {
      const v = r.value;
      log(
        `[${persona.agentId}] iter=${v.iterations} tools=[${v.toolCalls.join(", ")}] · ${v.output}`,
      );
      if (v.toolCalls.includes("placeBid")) placed.push(v);
    } else {
      log(`[${persona.agentId}] FAILED: ${(r.reason as Error)?.message ?? String(r.reason)}`);
    }
  }

  if (placed.length === 0) {
    throw new Error("No buyer agent successfully placed a bid");
  }
  log(`[buyers] ${placed.length}/${personas.length} bids reached the Exchange`);

  // ── Step 3: orchestrator clears the auction ────────────────────────────
  log("[exchange] clearing auction…");
  const auctionRes = await fetch(`${exchangeUrl}/auction/run/${listingId}`, { method: "POST" });
  const auctionJson = (await auctionRes.json()) as Record<string, unknown>;
  if (!auctionRes.ok) {
    throw new Error(`auction/run failed: ${auctionRes.status} ${JSON.stringify(auctionJson)}`);
  }

  const result = auctionJson.auctionResult as
    | { winnerBuyerAgentId: string; clearingPriceUsdc: string; winningBidUsdc: string }
    | undefined;
  const receipt = auctionJson.receipt as { status: string; arcTxHash?: string } | undefined;

  banner("Auction Cleared", [
    `Listing: ${listingTpl.vertical} (${listingId.slice(0, 8)}…)`,
    `Bids submitted: ${placed.length}`,
    `Winner: ${result?.winnerBuyerAgentId ?? "?"}`,
    `Winning bid: $${result?.winningBidUsdc ?? "?"} USDC`,
    `Clearing price: $${result?.clearingPriceUsdc ?? "?"} USDC (second-price + tick)`,
    `Settlement: ${receipt?.status ?? "?"}`,
    receipt?.arcTxHash ? `Tx: ${receipt.arcTxHash}` : "",
  ]);
}

const isEntry =
  typeof process !== "undefined" &&
  typeof process.argv[1] === "string" &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isEntry) {
  runOnce().catch((err: unknown) => {
    console.error("[agent:demo] failed:", err);
    process.exit(1);
  });
}

export { runOnce };
