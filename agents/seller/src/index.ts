import { gtUsdc, MAX_CLEARING_PRICE_USDC } from "@ade/shared";

import { createSellerAgent, type SellerAgent } from "./agent.js";
import { SELLER_CHAT_SYSTEM_PROMPT } from "./chatPrompt.js";
import { loadSellerConfig, type SellerAgentConfig } from "./config.js";
import { createGeminiLlmAdapter, type GoogleGenerativeAIClient } from "./llm/gemini.js";
import { SELLER_SYSTEM_PROMPT } from "./prompt.js";
import {
  createListInventoryTool,
  createRunAuctionTool,
  createServeAdTool,
  createViewHistoryTool,
  type AgentTool,
} from "./tools/index.js";

export { createSellerAgent } from "./agent.js";
export type {
  SellerAgent,
  SellerAgentRunResult,
  CreateSellerAgentDeps,
  LlmAdapter,
  LlmDecision,
} from "./agent.js";
export { SELLER_SYSTEM_PROMPT } from "./prompt.js";
export { SELLER_CHAT_SYSTEM_PROMPT } from "./chatPrompt.js";
export { loadSellerConfig } from "./config.js";
export type { SellerAgentConfig } from "./config.js";
export {
  createListInventoryTool,
  createRunAuctionTool,
  createServeAdTool,
  createViewHistoryTool,
} from "./tools/index.js";
export type { AgentTool, RunAuctionToolOutput } from "./tools/index.js";
export { createGeminiLlmAdapter } from "./llm/gemini.js";
export type { GeminiLlmAdapterConfig, GoogleGenerativeAIClient } from "./llm/gemini.js";

// Reason: single-seller demo; agent ID is fixed in-code rather than added to
// env config. Mirrors the literal used by runSeller's prior prompt.
const SELLER_AGENT_ID = "seller-default";

/**
 * Per-turn cap on chat-agent tool calls. Prevents a runaway model from
 * flooding `/inventory` or `/auction/run` between user turns. Distinct from
 * `MAX_AGENT_ITERATIONS` (5), which bounds total iterations including the
 * final-answer turn — see CLAUDE.md § Agent Framework Rules.
 */
export const MAX_TOOL_CALLS_PER_TURN = 2 as const;

interface BuildToolsDeps {
  exchangeUrl: string;
  sellerAgentId: string;
  sellerWallet: string;
}

function buildTools(deps: BuildToolsDeps): AgentTool<unknown, unknown>[] {
  return [
    createListInventoryTool({
      exchangeUrl: deps.exchangeUrl,
      sellerAgentId: deps.sellerAgentId,
      sellerWallet: deps.sellerWallet,
    }),
    createServeAdTool({ exchangeUrl: deps.exchangeUrl }),
    createViewHistoryTool({ exchangeUrl: deps.exchangeUrl }),
  ] as unknown as AgentTool<unknown, unknown>[];
}

/**
 * Wrap `listInventory` so the chat-surface floor cap (≤ $0.01 USDC) is enforced
 * BEFORE the POST hits the exchange. The cap also lives server-side at the
 * auction engine; this wrapper is the chat-surface defense in depth so a
 * runaway model never even attempts an out-of-policy listing.
 *
 * Mirrors `gtUsdc(floor, MAX_CLEARING_PRICE_USDC)` from `@ade/shared`.
 */
export function wrapWithFloorCap<TIn extends { floorPriceUsdc: string }, TOut>(
  tool: AgentTool<TIn, TOut>,
): AgentTool<TIn, TOut> {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
    async invoke(input) {
      if (gtUsdc(input.floorPriceUsdc, MAX_CLEARING_PRICE_USDC)) {
        throw new Error(
          `floorPriceUsdc=${input.floorPriceUsdc} exceeds chat-surface cap of ${MAX_CLEARING_PRICE_USDC} USDC`,
        );
      }
      return tool.invoke(input);
    },
  };
}

function buildChatTools(deps: BuildToolsDeps): AgentTool<unknown, unknown>[] {
  const listInventory = createListInventoryTool({
    exchangeUrl: deps.exchangeUrl,
    sellerAgentId: deps.sellerAgentId,
    sellerWallet: deps.sellerWallet,
  });
  return [
    wrapWithFloorCap(listInventory),
    createRunAuctionTool({ exchangeUrl: deps.exchangeUrl }),
    createServeAdTool({ exchangeUrl: deps.exchangeUrl }),
    createViewHistoryTool({ exchangeUrl: deps.exchangeUrl }),
  ] as unknown as AgentTool<unknown, unknown>[];
}

/**
 * Wire the seller agent against Google Gemini direct. The seller's typed
 * config (`loadSellerConfig`) requires `GEMINI_API_KEY` and `GEMINI_MODEL`.
 */
export function createSellerAgentWithGemini(
  overrides: { config?: SellerAgentConfig } = {},
): SellerAgent {
  const config = overrides.config ?? loadSellerConfig();
  const tools = buildTools({
    exchangeUrl: config.EXCHANGE_API_URL,
    sellerAgentId: SELLER_AGENT_ID,
    sellerWallet: config.SELLER_WALLET_ADDRESS,
  });
  const llm = createGeminiLlmAdapter({
    apiKey: config.GEMINI_API_KEY,
    model: config.GEMINI_MODEL,
    tools,
    // Reason: each cycle has exactly one job — register a listing. Forcing
    // the first tool call eliminates the AUTO-mode "answer in text instead
    // of calling the tool" failure that was killing ~80% of cycles.
    forceFirstToolCall: "listInventory",
  });
  return createSellerAgent({ llm, tools, systemPrompt: SELLER_SYSTEM_PROMPT });
}

/**
 * Wire the seller agent against Gemini for the multi-turn CHAT surface.
 *
 * Differs from `createSellerAgentWithGemini` in three load-bearing ways:
 *  1. AUTO mode (no `forceFirstToolCall`) — the model must pick the tool from
 *     the operator's text instruction.
 *  2. Tool set includes `runAuction` and the floor-capped `listInventory`.
 *  3. `maxToolCalls: MAX_TOOL_CALLS_PER_TURN` so a runaway model can't flood
 *     the exchange between user turns.
 */
export function createSellerChatAgentWithGemini(
  overrides: {
    config?: SellerAgentConfig;
    /** Test seam — see `createGeminiLlmAdapter`'s `clientFactory`. */
    clientFactory?: (apiKey: string) => GoogleGenerativeAIClient;
  } = {},
): SellerAgent {
  const config = overrides.config ?? loadSellerConfig();
  const tools = buildChatTools({
    exchangeUrl: config.EXCHANGE_API_URL,
    sellerAgentId: SELLER_AGENT_ID,
    sellerWallet: config.SELLER_WALLET_ADDRESS,
  });
  const llm = createGeminiLlmAdapter({
    apiKey: config.GEMINI_API_KEY,
    model: config.GEMINI_MODEL,
    tools,
    clientFactory: overrides.clientFactory,
  });
  return createSellerAgent({
    llm,
    tools,
    systemPrompt: SELLER_CHAT_SYSTEM_PROMPT,
    maxToolCalls: MAX_TOOL_CALLS_PER_TURN,
  });
}
