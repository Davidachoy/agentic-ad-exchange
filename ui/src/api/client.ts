import type { AdInventoryListing, AuctionResult, BidRequest, SettlementReceipt } from "@ade/shared";

import { uiEnv } from "../env.js";

/**
 * Thin fetch wrapper against the Exchange API. No auth headers — the demo
 * UI never holds secrets. Vite proxies /api → http://localhost:4021 in dev.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${uiEnv.VITE_API_BASE_URL}${path}`;
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`API ${path} → ${res.status}`);
  }
  return (await res.json()) as T;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function getInventory(): Promise<{ items: AdInventoryListing[] }> {
  return apiFetch("/inventory");
}

export async function postInventory(listing: AdInventoryListing): Promise<{ listingId: string }> {
  return apiFetch("/inventory", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(listing),
  });
}

export async function getBids(): Promise<{ items: BidRequest[] }> {
  return apiFetch("/bids");
}

export async function postBid(bid: BidRequest): Promise<{ bidId: string }> {
  return apiFetch("/bid", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(bid),
  });
}

export async function runAuction(
  listingId: string,
): Promise<{ auctionResult: AuctionResult; receipt: SettlementReceipt }> {
  return apiFetch(`/auction/run/${listingId}`, { method: "POST" });
}

export async function getSettlements(): Promise<{ items: SettlementReceipt[] }> {
  return apiFetch("/settlements");
}

export interface AgentDemoBidLog {
  agentId: string;
  bidId: string;
  output: string;
  iterations: number;
  toolCalls: string[];
  placed: boolean;
}

export interface AgentDemoResult {
  listingId: string;
  listingVertical: string;
  listingTags: string[];
  floorUsdc: string;
  sellerOutput: string;
  bids: AgentDemoBidLog[];
  winner?: { agentId: string; winningBidUsdc: string; clearingPriceUsdc: string };
  settlement?: { status: string; arcTxHash?: string };
}

export async function triggerAgentDemo(): Promise<AgentDemoResult> {
  return apiFetch("/demo/agent-run", { method: "POST" });
}
