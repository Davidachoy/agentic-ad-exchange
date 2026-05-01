import { randomBytes, randomUUID } from "node:crypto";

import {
  buildGatewayClient,
  createBuyerAgent,
  createCheckBalanceTool,
  createGeminiLlmAdapter,
  createPlaceBidTool,
  createReviewAuctionTool,
  type AgentTool as BuyerAgentTool,
  type BuyerAgent,
} from "@ade/agent-buyer";
import type { GatewayClient } from "@circle-fin/x402-batching/client";

import type { ListingStore } from "../state/stores.js";

/**
 * In-server orchestrator that drives one full multi-agent auction cycle:
 * seller agent registers a listing → N buyer agents bid in parallel → auction
 * clears via second-price → settlement transfer is dispatched to the winner's
 * Circle DCW (via the auction route's address-keyed wallet routing).
 */

export interface PersonaTemplate {
  agentId: string;
  brand: string;
  strategy: string;
  maxBid: string;
  minBid: string;
  preferredTags: ReadonlyArray<string>;
  walletIdEnvKey: string;
  walletAddressEnvKey: string;
}

export const PERSONA_TEMPLATES: ReadonlyArray<PersonaTemplate> = [
  {
    agentId: "buyer-luxuryco",
    brand: "LuxuryCo (premium fashion brand awareness)",
    strategy:
      "Brand awareness for high-CPM premium audiences. Pay up for luxury contexts; pull back hard on commodity inventory.",
    maxBid: "0.009",
    minBid: "0.003",
    preferredTags: ["luxury", "fashion", "premium", "high-income"],
    walletIdEnvKey: "BUYER_LUXURYCO_WALLET_ID",
    walletAddressEnvKey: "BUYER_LUXURYCO_WALLET_ADDRESS",
  },
  {
    agentId: "buyer-growthco",
    brand: "GrowthCo (B2B SaaS performance marketing)",
    strategy:
      "ROAS-optimized. Strict CPM caps. Pay near max only for developer/SaaS contexts where conversion likelihood is high.",
    maxBid: "0.005",
    minBid: "0.002",
    preferredTags: ["tech", "saas", "b2b", "developer"],
    walletIdEnvKey: "BUYER_GROWTHCO_WALLET_ID",
    walletAddressEnvKey: "BUYER_GROWTHCO_WALLET_ADDRESS",
  },
  {
    agentId: "buyer-retailco",
    brand: "RetailCo (e-commerce retargeting)",
    strategy:
      "Dynamic CPM by intent signal. Top dollar for cart-abandoner cohorts; floor-only for cold traffic.",
    maxBid: "0.008",
    minBid: "0.002",
    preferredTags: ["retail", "ecommerce", "shopping", "checkout-intent"],
    walletIdEnvKey: "BUYER_RETAILCO_WALLET_ID",
    walletAddressEnvKey: "BUYER_RETAILCO_WALLET_ADDRESS",
  },
];

export interface ResolvedPersona {
  agentId: string;
  brand: string;
  strategy: string;
  maxBid: string;
  minBid: string;
  preferredTags: ReadonlyArray<string>;
  walletId: string;
  walletAddress: string;
}

export function resolvePersonasFromEnv(env: NodeJS.ProcessEnv): ResolvedPersona[] {
  const out: ResolvedPersona[] = [];
  for (const t of PERSONA_TEMPLATES) {
    const walletId = env[t.walletIdEnvKey];
    const walletAddress = env[t.walletAddressEnvKey];
    if (!walletId || !walletAddress) continue;
    out.push({
      agentId: t.agentId,
      brand: t.brand,
      strategy: t.strategy,
      maxBid: t.maxBid,
      minBid: t.minBid,
      preferredTags: t.preferredTags,
      walletId,
      walletAddress,
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

function buildBuyerAgentForPersona(
  persona: ResolvedPersona,
  cfg: {
    apiKey: string;
    model: string;
    exchangeUrl: string;
    gatewayClient?: GatewayClient;
    bidId: string;
    nonce: string;
    createdAt: Date;
  },
): BuyerAgent {
  const tools: BuyerAgentTool<unknown, unknown>[] = [
    createPlaceBidTool({
      exchangeUrl: cfg.exchangeUrl,
      buyerAgentId: persona.agentId,
      buyerWallet: persona.walletAddress,
      gatewayClient: cfg.gatewayClient,
      randomUuidImpl: () => cfg.bidId,
      nonceImpl: () => cfg.nonce,
      nowImpl: () => cfg.createdAt,
    }),
    createCheckBalanceTool({ exchangeUrl: cfg.exchangeUrl }),
    createReviewAuctionTool({ exchangeUrl: cfg.exchangeUrl }),
  ];
  const llm = createGeminiLlmAdapter({ apiKey: cfg.apiKey, model: cfg.model, tools });
  const systemPrompt = [
    `You are an autonomous buying agent operating on behalf of ${persona.brand}.`,
    "",
    `Mission: ${persona.strategy}`,
    `Bid range: $${persona.minBid} – $${persona.maxBid} USDC per impression.`,
    `Preferred context tags: ${persona.preferredTags.join(", ")}.`,
    "",
    "Decision policy:",
    " - Strong tag overlap (≥2 of your preferred tags) → bid near your max.",
    " - Partial overlap (1 tag) → bid mid-range.",
    " - No overlap → bid at your min, exploring the cohort.",
    "",
    "Hard rules:",
    "1. Place exactly ONE bid via the placeBid tool, then stop.",
    "2. Bid amount must respect your range and the listing floor.",
    "3. Set targeting.contextTags to the subset of YOUR preferred tags that overlap with the listing.",
    "4. After placeBid returns, output ONE short sentence: 'Bid $X.XXX — <reasoning>'.",
  ].join("\n");
  return createBuyerAgent({ llm, tools, systemPrompt });
}

function buildBuyerPrompt(
  persona: ResolvedPersona,
  listing: { listingId: string; floor: string; tags: ReadonlyArray<string>; description: string },
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
    "Call placeBid with:",
    `- targeting.adType: "display"`,
    `- targeting.format: "banner"`,
    `- targeting.size: "300x250"`,
    "- targeting.contextTags: the subset of your preferred tags that overlap with the listing.",
    `- bidAmountUsdc: a value within $${persona.minBid}–$${persona.maxBid} based on match quality.`,
    `- budgetRemainingUsdc: "1.000".`,
  ].join("\n");
}

export interface BidLog {
  agentId: string;
  bidId: string;
  output: string;
  iterations: number;
  toolCalls: ReadonlyArray<string>;
  placed: boolean;
}

export interface AgentAuctionResult {
  listingId: string;
  listingVertical: string;
  listingTags: ReadonlyArray<string>;
  floorUsdc: string;
  sellerOutput: string;
  bids: BidLog[];
  winner?: { agentId: string; winningBidUsdc: string; clearingPriceUsdc: string };
  settlement?: { status: string; arcTxHash?: string };
}

export interface AgentAuctionDeps {
  exchangeUrl: string;
  /**
   * Source of existing inventory. The orchestrator picks the oldest unsold
   * listing from this store; it does not create new listings.
   */
  listingStore: ListingStore;
  personas: ResolvedPersona[];
  gemini: { apiKey: string; model: string };
  /**
   * Shared EOA private key used to sign x402 payment authorizations for every
   * persona's bid. Optional: when absent, bids fall through to plain fetch and
   * will be 402'd by the gateway middleware on /bid.
   */
  buyerPrivateKey?: `0x${string}`;
  rng?: () => number;
}

export async function runAgentAuction(deps: AgentAuctionDeps): Promise<AgentAuctionResult> {
  if (deps.personas.length === 0) {
    throw new Error("runAgentAuction: no personas resolved — set BUYER_*_WALLET_ID/_ADDRESS env");
  }
  const rng = deps.rng ?? Math.random;

  // Step 1: pick an existing listing from the seller's inventory.
  // The demo no longer auto-registers a new listing — listings come in via
  // the SellerPanel "+ Register Demo Ad Slot" button (POST /inventory).
  const inventory = await deps.listingStore.list();
  if (inventory.length === 0) {
    throw new Error(
      "no_inventory_available: register an ad slot from the Seller panel before running the multi-agent auction",
    );
  }
  // FIFO: oldest listing (insertion order) is consumed first.
  const listing = inventory[0]!;

  // The on-store listing schema doesn't carry a description or context tags,
  // so synthesize narrative context for the buyer prompts from a template.
  // This lets buyers reason about cohort fit while the auction itself runs
  // against the real listing's listingId / floorPriceUsdc / sellerWallet.
  const tpl = LISTING_TEMPLATES[Math.floor(rng() * LISTING_TEMPLATES.length)]!;
  const listingForBuyers = {
    listingId: listing.listingId,
    floor: listing.floorPriceUsdc,
    tags: tpl.contextTags,
    description: tpl.description,
  };
  const sellerOutput = `Consumed listing #${listing.listingId.slice(0, 8)} (${listing.format} ${listing.size}, floor $${listing.floorPriceUsdc} USDC)`;
  // Build one shared GatewayClient when a buyer EOA key is configured; every
  // persona's placeBid tool reuses it so bids carry a Payment-Signature
  // header and clear the x402 nanopayments middleware on /bid. Settlement on
  // the auction route still routes per-persona via buyerWalletRouting.
  const gatewayClient = deps.buyerPrivateKey
    ? buildGatewayClient(deps.buyerPrivateKey, "arcTestnet")
    : undefined;
  // Pre-generate the bid identifiers per persona so we can both inject them
  // into the placeBid tool (preventing LLM hallucination of these fields)
  // and report the bidId in the BidLog without round-tripping through the
  // tool's return value.
  const ctxs = deps.personas.map(() => ({
    bidId: randomUUID(),
    nonce: nonce(),
    createdAt: new Date(),
  }));
  const buyers = deps.personas.map((p, i) =>
    buildBuyerAgentForPersona(p, {
      apiKey: deps.gemini.apiKey,
      model: deps.gemini.model,
      exchangeUrl: deps.exchangeUrl,
      gatewayClient,
      bidId: ctxs[i]!.bidId,
      nonce: ctxs[i]!.nonce,
      createdAt: ctxs[i]!.createdAt,
    }),
  );
  const settled = await Promise.allSettled(
    deps.personas.map(async (p, i) => {
      const r = await buyers[i]!.run(buildBuyerPrompt(p, listingForBuyers));
      return { persona: p, ctx: ctxs[i]!, r };
    }),
  );

  const bids: BidLog[] = [];
  for (let i = 0; i < settled.length; i++) {
    const s = settled[i]!;
    const persona = deps.personas[i]!;
    if (s.status === "fulfilled") {
      bids.push({
        agentId: persona.agentId,
        bidId: s.value.ctx.bidId,
        output: s.value.r.output,
        iterations: s.value.r.iterations,
        toolCalls: s.value.r.toolCalls,
        placed: s.value.r.toolCalls.includes("placeBid"),
      });
    } else {
      bids.push({
        agentId: persona.agentId,
        bidId: "",
        output: `FAILED: ${(s.reason as Error)?.message ?? String(s.reason)}`,
        iterations: 0,
        toolCalls: [],
        placed: false,
      });
    }
  }
  if (!bids.some((b) => b.placed)) {
    throw new Error("No buyer agent placed a bid");
  }

  // Step 3: clear the auction via the Exchange's own HTTP route
  const auctionRes = await fetch(`${deps.exchangeUrl}/auction/run/${listing.listingId}`, {
    method: "POST",
  });
  const auctionJson = (await auctionRes.json()) as Record<string, unknown>;
  if (!auctionRes.ok) {
    throw new Error(`auction/run failed: ${auctionRes.status} ${JSON.stringify(auctionJson)}`);
  }

  const ar = auctionJson.auctionResult as
    | { winnerBuyerAgentId: string; clearingPriceUsdc: string; winningBidUsdc: string }
    | undefined;
  const receipt = auctionJson.receipt as { status: string; arcTxHash?: string } | undefined;

  return {
    listingId: listing.listingId,
    listingVertical: tpl.vertical,
    listingTags: tpl.contextTags,
    floorUsdc: listing.floorPriceUsdc,
    sellerOutput,
    bids,
    winner: ar
      ? {
          agentId: ar.winnerBuyerAgentId,
          winningBidUsdc: ar.winningBidUsdc,
          clearingPriceUsdc: ar.clearingPriceUsdc,
        }
      : undefined,
    settlement: receipt ? { status: receipt.status, arcTxHash: receipt.arcTxHash } : undefined,
  };
}
