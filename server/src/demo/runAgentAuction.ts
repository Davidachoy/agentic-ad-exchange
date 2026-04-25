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
import { createSellerAgentWithGemini } from "@ade/agent-seller";
import type { GatewayClient } from "@circle-fin/x402-batching/client";

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
  },
): BuyerAgent {
  const tools: BuyerAgentTool<unknown, unknown>[] = [
    createPlaceBidTool({ exchangeUrl: cfg.exchangeUrl, gatewayClient: cfg.gatewayClient }),
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
    "3. Use the exact bidId, buyerWallet, nonce, and createdAt values from the user message verbatim.",
    "4. Set targeting.contextTags to the subset of YOUR preferred tags that overlap with the listing.",
    "5. After placeBid returns, output ONE short sentence: 'Bid $X.XXX — <reasoning>'.",
  ].join("\n");
  return createBuyerAgent({ llm, tools, systemPrompt });
}

function buildBuyerPrompt(
  persona: ResolvedPersona,
  listing: { listingId: string; floor: string; tags: ReadonlyArray<string>; description: string },
  ctx: { bidId: string; nonce: string; createdAt: string },
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
  sellerWallet: string;
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
  const tpl = LISTING_TEMPLATES[Math.floor(rng() * LISTING_TEMPLATES.length)]!;

  // Step 1: seller agent registers the listing
  const listingId = randomUUID();
  const sellerNow = new Date().toISOString();
  const sellerPrompt = [
    "Register a new ad inventory listing on the Exchange.",
    `Inventory description: ${tpl.description}`,
    "Use the listInventory tool ONCE with EXACTLY these field values:",
    `- listingId: "${listingId}"`,
    `- sellerAgentId: "seller-${tpl.vertical}"`,
    `- sellerWallet: "${deps.sellerWallet}"`,
    `- adType: "display"`,
    `- format: "banner"`,
    `- size: "300x250"`,
    `- contextualExclusions: []`,
    `- floorPriceUsdc: "${tpl.floorUsdc}"`,
    `- createdAt: "${sellerNow}"`,
  ].join("\n");

  // Gemini's FunctionCallingMode.AUTO occasionally returns text instead of a
  // tool call. Retry the seller's run a few times if listInventory wasn't
  // invoked — each retry resets the chat session in the Gemini adapter, so
  // attempts are independent. The retry is cheap relative to the cost of a
  // demo-time stack trace.
  const seller = createSellerAgentWithGemini();
  const SELLER_MAX_ATTEMPTS = 3;
  let sellerResult: Awaited<ReturnType<typeof seller.run>> | undefined;
  for (let attempt = 1; attempt <= SELLER_MAX_ATTEMPTS; attempt++) {
    sellerResult = await seller.run(sellerPrompt);
    if (sellerResult.toolCalls.includes("listInventory")) break;
  }
  if (!sellerResult || !sellerResult.toolCalls.includes("listInventory")) {
    throw new Error(
      `Seller agent did not call listInventory after ${SELLER_MAX_ATTEMPTS} attempts. ` +
        `Last toolCalls=[${sellerResult?.toolCalls.join(",") ?? ""}], ` +
        `output=${JSON.stringify(sellerResult?.output ?? "")}`,
    );
  }

  // Step 2: buyer agents compete in parallel
  const listingForBuyers = {
    listingId,
    floor: tpl.floorUsdc,
    tags: tpl.contextTags,
    description: tpl.description,
  };
  // Build one shared GatewayClient when a buyer EOA key is configured; every
  // persona's placeBid tool reuses it so bids carry a Payment-Signature
  // header and clear the x402 nanopayments middleware on /bid. Settlement on
  // the auction route still routes per-persona via buyerWalletRouting.
  const gatewayClient = deps.buyerPrivateKey
    ? buildGatewayClient(deps.buyerPrivateKey, "arcTestnet")
    : undefined;
  const buyers = deps.personas.map((p) =>
    buildBuyerAgentForPersona(p, {
      apiKey: deps.gemini.apiKey,
      model: deps.gemini.model,
      exchangeUrl: deps.exchangeUrl,
      gatewayClient,
    }),
  );
  const settled = await Promise.allSettled(
    deps.personas.map(async (p, i) => {
      const ctx = { bidId: randomUUID(), nonce: nonce(), createdAt: new Date().toISOString() };
      const r = await buyers[i]!.run(buildBuyerPrompt(p, listingForBuyers, ctx));
      return { persona: p, ctx, r };
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
  const auctionRes = await fetch(`${deps.exchangeUrl}/auction/run/${listingId}`, {
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
    listingId,
    listingVertical: tpl.vertical,
    listingTags: tpl.contextTags,
    floorUsdc: tpl.floorUsdc,
    sellerOutput: sellerResult.output,
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
