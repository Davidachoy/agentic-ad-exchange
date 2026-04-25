import { loadBuyerConfig } from "@ade/agent-buyer";
import { resolvePersonasFromEnv, runAgentAuction } from "@ade/server";
import { createCircleClient } from "@ade/wallets";

import { loadScriptsConfig } from "./config.js";
import { banner, log } from "./logger.js";

/**
 * CLI wrapper around `runAgentAuction` (defined in @ade/server). Resolves the
 * persona wallets from .env.local, prints a balance preflight, runs one full
 * Gemini-driven auction cycle against the local Exchange, and prints the
 * result. The same orchestrator is exposed via POST /demo/agent-run so the UI
 * can trigger it without a terminal.
 */

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

  const personas = resolvePersonasFromEnv(process.env);
  if (personas.length === 0) {
    throw new Error(
      "No personas resolved. Set BUYER_LUXURYCO/GROWTHCO/RETAILCO_WALLET_ID + _ADDRESS in .env.local.",
    );
  }
  const buyerCfg = loadBuyerConfig();
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
    `Buyers competing: ${personas.length} (per-persona Circle DCWs)`,
    "",
    "Persona balances:",
    ...balances.map(
      (b) => `  ${b.agentId.padEnd(16)} ${b.address.slice(0, 10)}…  ${b.usdc} USDC`,
    ),
  ]);

  const result = await runAgentAuction({
    exchangeUrl,
    sellerWallet,
    personas,
    gemini: { apiKey: buyerCfg.GEMINI_API_KEY, model: buyerCfg.GEMINI_MODEL },
  });

  log(`[seller] ${result.sellerOutput}`);
  for (const b of result.bids) {
    log(`[${b.agentId}] iter=${b.iterations} placed=${b.placed} · ${b.output}`);
  }

  banner("Auction Cleared", [
    `Listing: ${result.listingVertical} (${result.listingId.slice(0, 8)}…)`,
    `Tags: ${result.listingTags.join(", ")}  Floor: $${result.floorUsdc}`,
    `Bids submitted: ${result.bids.filter((b) => b.placed).length}`,
    `Winner: ${result.winner?.agentId ?? "?"}`,
    `Winning bid: $${result.winner?.winningBidUsdc ?? "?"} USDC`,
    `Clearing price: $${result.winner?.clearingPriceUsdc ?? "?"} USDC`,
    `Settlement: ${result.settlement?.status ?? "?"}`,
    result.settlement?.arcTxHash ? `Tx: ${result.settlement.arcTxHash}` : "",
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
