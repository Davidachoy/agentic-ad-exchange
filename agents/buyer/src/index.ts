import { createBuyerAgent, type BuyerAgent } from "./agent.js";
import { loadBuyerConfig, type BuyerAgentConfig } from "./config.js";
import { createGeminiLlmAdapter } from "./llm/index.js";
import { BUYER_SYSTEM_PROMPT } from "./prompt.js";
import {
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
} from "./tools/index.js";
export type { AgentTool } from "./tools/index.js";
export { createGeminiLlmAdapter, zodToGeminiSchema } from "./llm/index.js";
export type { GeminiLlmAdapterConfig, GoogleGenerativeAIClient } from "./llm/index.js";

function buildTools(exchangeUrl: string): AgentTool<unknown, unknown>[] {
  return [
    createPlaceBidTool({ exchangeUrl }),
    createCheckBalanceTool({ exchangeUrl }),
    createReviewAuctionTool({ exchangeUrl }),
  ];
}

/**
 * Wire the buyer agent against Google Gemini direct. The buyer's typed config
 * (`loadBuyerConfig`) requires `GEMINI_API_KEY` and `GEMINI_MODEL`.
 */
export function createBuyerAgentWithGemini(
  overrides: { config?: BuyerAgentConfig } = {},
): BuyerAgent {
  const config = overrides.config ?? loadBuyerConfig();
  const tools = buildTools(config.EXCHANGE_API_URL);
  const llm = createGeminiLlmAdapter({
    apiKey: config.GEMINI_API_KEY,
    model: config.GEMINI_MODEL,
    tools,
  });
  return createBuyerAgent({ llm, tools, systemPrompt: BUYER_SYSTEM_PROMPT });
}
