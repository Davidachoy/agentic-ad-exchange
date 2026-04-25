import { resolvePersonasFromEnv, type AgentAuctionResult } from "@ade/server";
import { createCircleClient } from "@ade/wallets";

import { loadScriptsConfig } from "./config.js";
import { banner, log } from "./logger.js";

/**
 * CLI wrapper around the multi-agent auction. The orchestrator reads existing
 * inventory from the Exchange's in-memory listingStore, so the script cannot
 * call `runAgentAuction` directly — instead it POSTs to /demo/agent-run, the
 * same route the UI's "Run Multi-Agent Auction" button uses. Keeps the two
 * trigger paths behaviorally identical.
 */

async function runOnce(): Promise<void> {
  const config = loadScriptsConfig();
  const exchangeUrl = config.EXCHANGE_API_URL ?? "http://localhost:4021";

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

  const res = await fetch(`${exchangeUrl}/demo/agent-run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`POST /demo/agent-run failed: ${res.status} ${body}`);
  }
  const result = (await res.json()) as AgentAuctionResult;

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
