import { randomBytes, randomUUID } from "node:crypto";

import { createBuyerAgentWithGemini } from "@ade/agent-buyer";
import { createSellerAgentWithGemini } from "@ade/agent-seller";

import { loadScriptsConfig } from "./config.js";
import { banner, log } from "./logger.js";

/**
 * End-to-end Gemini-driven agent demo.
 *
 * Drives the seller and buyer agents through one full auction cycle:
 *   1. Seller agent calls `listInventory` to register a 300x250 banner.
 *   2. Buyer agent calls `placeBid` to bid against it.
 *   3. Orchestrator triggers `POST /auction/run/:listingId` to clear.
 *
 * Each prompt hands the LLM the exact field values to use; the LLM picks the
 * correct tool from descriptions alone and emits a valid tool call. The
 * Exchange server (running separately) records the bid + listing, and the UI
 * (also running separately) sees them appear via /events SSE + polling.
 */

interface AgentRunResult {
  output: string;
  toolCalls: string[];
  iterations: number;
}

function nonce(): string {
  return "0x" + randomBytes(32).toString("hex");
}

async function runOnce(): Promise<void> {
  const config = loadScriptsConfig();
  const exchangeUrl = config.EXCHANGE_API_URL ?? "http://localhost:4021";

  const sellerWallet = config.SELLER_WALLET_ADDRESS;
  const buyerWallet = config.BUYER_WALLET_ADDRESS;
  if (!sellerWallet || !buyerWallet) {
    throw new Error(
      "agent:demo requires SELLER_WALLET_ADDRESS and BUYER_WALLET_ADDRESS in .env.local — run create:wallets first.",
    );
  }

  // Verify Exchange is reachable before spending Gemini calls.
  const health = await fetch(`${exchangeUrl}/health`).catch(() => null);
  if (!health || !health.ok) {
    throw new Error(
      `Exchange not reachable at ${exchangeUrl}/health. Start it with: pnpm --filter @ade/server dev`,
    );
  }

  banner("Agent Demo — orchestrator starting", [
    `Exchange: ${exchangeUrl}`,
    `Seller wallet: ${sellerWallet}`,
    `Buyer wallet: ${buyerWallet}`,
  ]);

  // ── Step 1: seller registers an ad slot ─────────────────────────────────
  const listingId = randomUUID();
  const sellerNow = new Date().toISOString();
  const sellerPrompt = [
    "Register a new ad inventory listing on the Exchange.",
    "Call the listInventory tool ONCE with EXACTLY these field values:",
    `- listingId: "${listingId}"`,
    `- sellerAgentId: "seller-agent-sigma"`,
    `- sellerWallet: "${sellerWallet}"`,
    `- adType: "display"`,
    `- format: "banner"`,
    `- size: "300x250"`,
    `- contextualExclusions: []`,
    `- floorPriceUsdc: "0.002"`,
    `- createdAt: "${sellerNow}"`,
    "After the tool returns, output a one-line confirmation.",
  ].join("\n");

  log("[seller] invoking Gemini…");
  const seller = createSellerAgentWithGemini();
  const sellerResult: AgentRunResult = await seller.run(sellerPrompt);
  log(
    `[seller] done · iterations=${sellerResult.iterations} · tools=[${sellerResult.toolCalls.join(", ")}]`,
  );
  log(`[seller] output: ${sellerResult.output}`);
  if (!sellerResult.toolCalls.includes("listInventory")) {
    throw new Error("Seller agent did not call listInventory — aborting.");
  }

  // ── Step 2: buyer places a bid ──────────────────────────────────────────
  const bidId = randomUUID();
  const bidNonce = nonce();
  const buyerNow = new Date().toISOString();
  const buyerPrompt = [
    `Place a bid on the Exchange for listing "${listingId}" (300x250 banner).`,
    "Call the placeBid tool ONCE with EXACTLY these field values:",
    `- bidId: "${bidId}"`,
    `- buyerAgentId: "buyer-agent-alpha"`,
    `- buyerWallet: "${buyerWallet}"`,
    `- targeting: { adType: "display", format: "banner", size: "300x250", contextTags: ["tech", "ai"] }`,
    `- bidAmountUsdc: "0.008"`,
    `- budgetRemainingUsdc: "1.000"`,
    `- nonce: "${bidNonce}"`,
    `- createdAt: "${buyerNow}"`,
    "After the tool returns, output a one-line confirmation.",
  ].join("\n");

  log("[buyer] invoking Gemini…");
  const buyer = createBuyerAgentWithGemini();
  const buyerResult: AgentRunResult = await buyer.run(buyerPrompt);
  log(
    `[buyer] done · iterations=${buyerResult.iterations} · tools=[${buyerResult.toolCalls.join(", ")}]`,
  );
  log(`[buyer] output: ${buyerResult.output}`);
  if (!buyerResult.toolCalls.includes("placeBid")) {
    throw new Error("Buyer agent did not call placeBid — aborting.");
  }

  // ── Step 3: orchestrator triggers the auction ──────────────────────────
  log("[orchestrator] triggering auction…");
  const auctionRes = await fetch(`${exchangeUrl}/auction/run/${listingId}`, {
    method: "POST",
  });
  const auctionJson = (await auctionRes.json()) as Record<string, unknown>;
  if (!auctionRes.ok) {
    throw new Error(`auction/run failed: ${auctionRes.status} ${JSON.stringify(auctionJson)}`);
  }

  const result = auctionJson.auctionResult as
    | { winnerBuyerAgentId: string; clearingPriceUsdc: string }
    | undefined;
  const receipt = auctionJson.receipt as
    | { status: string; arcTxHash?: string }
    | undefined;

  banner("Agent Demo — complete", [
    `Listing: ${listingId}`,
    `Winner: ${result?.winnerBuyerAgentId ?? "?"}`,
    `Clearing: ${result?.clearingPriceUsdc ?? "?"} USDC`,
    `Settlement: ${receipt?.status ?? "?"}`,
    receipt?.arcTxHash ? `Tx: ${receipt.arcTxHash}` : "",
    "",
    "UI should now show the winning ad in the Buyer panel.",
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
