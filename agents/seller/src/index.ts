import { createSellerAgent, type SellerAgent } from "./agent.js";
import { loadSellerConfig, type SellerAgentConfig } from "./config.js";
import { createGeminiLlmAdapter } from "./llm/gemini.js";
import { SELLER_SYSTEM_PROMPT } from "./prompt.js";
import {
  createListInventoryTool,
  createServeAdTool,
  createViewHistoryTool,
  type AgentTool,
} from "./tools/index.js";

export { createSellerAgent } from "./agent.js";
export type { SellerAgent, CreateSellerAgentDeps, LlmAdapter, LlmDecision } from "./agent.js";
export { SELLER_SYSTEM_PROMPT } from "./prompt.js";
export { loadSellerConfig } from "./config.js";
export type { SellerAgentConfig } from "./config.js";
export {
  createListInventoryTool,
  createServeAdTool,
  createViewHistoryTool,
} from "./tools/index.js";
export type { AgentTool } from "./tools/index.js";
export { createGeminiLlmAdapter } from "./llm/gemini.js";
export type { GeminiLlmAdapterConfig, GoogleGenerativeAIClient } from "./llm/gemini.js";

function buildTools(exchangeUrl: string): AgentTool<unknown, unknown>[] {
  return [
    createListInventoryTool({ exchangeUrl }),
    createServeAdTool({ exchangeUrl }),
    createViewHistoryTool({ exchangeUrl }),
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
  const tools = buildTools(config.EXCHANGE_API_URL);
  const llm = createGeminiLlmAdapter({
    apiKey: config.GEMINI_API_KEY,
    model: config.GEMINI_MODEL,
    tools,
  });
  return createSellerAgent({ llm, tools, systemPrompt: SELLER_SYSTEM_PROMPT });
}
