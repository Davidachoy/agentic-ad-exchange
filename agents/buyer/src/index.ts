import type { SupportedChainName } from "@circle-fin/x402-batching/client";

import { createBuyerAgent, type BuyerAgent } from "./agent.js";
import { loadBuyerConfig, type BuyerAgentConfig } from "./config.js";
import { createGeminiLlmAdapter } from "./llm/index.js";
import { BUYER_SYSTEM_PROMPT } from "./prompt.js";
import {
  buildGatewayClient,
  createCheckBalanceTool,
  createPlaceBidTool,
  createReviewAuctionTool,
  type AgentTool,
} from "./tools/index.js";

export { createBuyerAgent } from "./agent.js";
export type { BuyerAgent, CreateBuyerAgentDeps, LlmAdapter, LlmDecision } from "./agent.js";
export { BUYER_SYSTEM_PROMPT } from "./prompt.js";
export { loadBuyerConfig } from "./config.js";
export type { BuyerAgentConfig } from "./config.js";
export {
  createPlaceBidTool,
  createCheckBalanceTool,
  createReviewAuctionTool,
  buildGatewayClient,
} from "./tools/index.js";
export type { AgentTool } from "./tools/index.js";
export { createGeminiLlmAdapter, zodToGeminiSchema } from "./llm/index.js";
export type { GeminiLlmAdapterConfig, GoogleGenerativeAIClient } from "./llm/index.js";

interface BuildToolsDeps {
  exchangeUrl: string;
  buyerAgentId: string;
  buyerWallet: string;
  privateKey?: `0x${string}`;
  chain?: SupportedChainName;
}

function buildTools(deps: BuildToolsDeps): AgentTool<unknown, unknown>[] {
  const gatewayClient =
    deps.privateKey ? buildGatewayClient(deps.privateKey, deps.chain ?? "arcTestnet") : undefined;
  return [
    createPlaceBidTool({
      exchangeUrl: deps.exchangeUrl,
      buyerAgentId: deps.buyerAgentId,
      buyerWallet: deps.buyerWallet,
      gatewayClient,
    }),
    createCheckBalanceTool({ exchangeUrl: deps.exchangeUrl }),
    createReviewAuctionTool({ exchangeUrl: deps.exchangeUrl }),
  ];
}

/**
 * Wire the buyer agent against Google Gemini direct. The buyer's typed config
 * (`loadBuyerConfig`) requires `GEMINI_API_KEY` and `GEMINI_MODEL`.
 * When `BUYER_PRIVATE_KEY` is set, placeBid uses GatewayClient to handle 402.
 */
export function createBuyerAgentWithGemini(
  overrides: { config?: BuyerAgentConfig } = {},
): BuyerAgent {
  const config = overrides.config ?? loadBuyerConfig();
  const tools = buildTools({
    exchangeUrl: config.EXCHANGE_API_URL,
    buyerAgentId: config.BUYER_AGENT_ID,
    buyerWallet: config.BUYER_WALLET_ADDRESS,
    privateKey: config.BUYER_PRIVATE_KEY as `0x${string}` | undefined,
    chain: config.BUYER_CHAIN as SupportedChainName | undefined,
  });
  const llm = createGeminiLlmAdapter({
    apiKey: config.GEMINI_API_KEY,
    model: config.GEMINI_MODEL,
    tools,
  });
  return createBuyerAgent({ llm, tools, systemPrompt: BUYER_SYSTEM_PROMPT });
}
