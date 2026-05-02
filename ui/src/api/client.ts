import {
  AssistantChatResponseSchema,
  type AdInventoryListing,
  type AssistantChatRequest,
  type AssistantChatResponse,
  type AuctionResult,
  type BidRequest,
  type SettlementReceipt,
} from "@ade/shared";

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

export async function getControlState(): Promise<{ paused: boolean }> {
  return apiFetch("/control/state");
}

export async function pauseDemo(): Promise<{ paused: boolean }> {
  return apiFetch("/control/pause", { method: "POST" });
}

export async function resumeDemo(): Promise<{ paused: boolean }> {
  return apiFetch("/control/resume", { method: "POST" });
}

export interface AssistantChatHttpError extends Error {
  status: number;
  code?: string;
}

/** Client ceiling for POST /assistant/chat (slightly above server Gemini abort). */
export const ASSISTANT_FETCH_DEADLINE_MS = 130_000;

export async function postAssistantChat(
  body: AssistantChatRequest,
  options?: { signal?: AbortSignal },
): Promise<AssistantChatResponse> {
  const url = `${uiEnv.VITE_API_BASE_URL}/assistant/chat`;
  const deadline = AbortSignal.timeout(ASSISTANT_FETCH_DEADLINE_MS);
  const signal =
    options?.signal !== undefined ? AbortSignal.any([options.signal, deadline]) : deadline;
  const res = await fetch(url, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
    signal,
  });
  const raw: unknown = await res.json().catch(() => (null));
  if (!res.ok) {
    const code =
      typeof raw === "object" && raw !== null && "code" in raw && typeof (raw as { code: unknown }).code === "string"
        ? (raw as { code: string }).code
        : undefined;
    const err = new Error(`assistant ${res.status}`) as AssistantChatHttpError;
    err.status = res.status;
    err.code = code;
    throw err;
  }
  const parsed = AssistantChatResponseSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }
  const reply =
    typeof raw === "object" && raw !== null && "reply" in raw && typeof (raw as { reply: unknown }).reply === "string"
      ? (raw as { reply: string }).reply
      : "Invalid assistant response.";
  return { reply };
}
