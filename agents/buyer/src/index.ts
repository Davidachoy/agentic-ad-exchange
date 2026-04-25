import { createBuyerAgent, type BuyerAgent } from "./agent.js";
import { loadBuyerConfig, type BuyerAgentConfig } from "./config.js";
import {
  createAimlApiLlmAdapter,
  createGeminiLlmAdapter,
} from "./llm/index.js";
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
export {
  createGeminiLlmAdapter,
  createAimlApiLlmAdapter,
  zodToGeminiSchema,
  zodToJsonSchema,
} from "./llm/index.js";
export type {
  GeminiLlmAdapterConfig,
  GoogleGenerativeAIClient,
  AimlApiLlmAdapterConfig,
  JsonSchema,
} from "./llm/index.js";

function buildTools(exchangeUrl: string): AgentTool<unknown, unknown>[] {
  return [
    createPlaceBidTool({ exchangeUrl }),
    createCheckBalanceTool({ exchangeUrl }),
    createReviewAuctionTool({ exchangeUrl }),
  ];
}

/**
 * Wire the buyer agent against Google Gemini direct. Use when GEMINI_API_KEY
 * points at a project with billing + generativelanguage.googleapis.com enabled.
 */
export function createBuyerAgentWithGemini(
  overrides: { config?: BuyerAgentConfig } = {},
): BuyerAgent {
  const config = overrides.config ?? loadBuyerConfig();
  if (!config.gemini) {
    throw new Error("createBuyerAgentWithGemini: GEMINI_API_KEY not set in config");
  }
  const tools = buildTools(config.EXCHANGE_API_URL);
  const llm = createGeminiLlmAdapter({
    apiKey: config.gemini.GEMINI_API_KEY,
    model: config.gemini.GEMINI_MODEL,
    tools,
  });
  return createBuyerAgent({ llm, tools, systemPrompt: BUYER_SYSTEM_PROMPT });
}

/**
 * Wire the buyer agent against AIMLAPI (OpenAI-compatible, proxies to Gemini
 * server-side). Use this while Google billing is not yet provisioned.
 */
export function createBuyerAgentWithAimlApi(
  overrides: { config?: BuyerAgentConfig } = {},
): BuyerAgent {
  const config = overrides.config ?? loadBuyerConfig();
  if (!config.aimlapi) {
    throw new Error("createBuyerAgentWithAimlApi: AIMLAPI_API_KEY not set in config");
  }
  const tools = buildTools(config.EXCHANGE_API_URL);
  const llm = createAimlApiLlmAdapter({
    apiKey: config.aimlapi.AIMLAPI_API_KEY,
    model: config.aimlapi.AIMLAPI_MODEL,
    baseUrl: config.aimlapi.AIMLAPI_BASE_URL,
    tools,
  });
  return createBuyerAgent({ llm, tools, systemPrompt: BUYER_SYSTEM_PROMPT });
}

/**
 * Provider-agnostic factory. Dispatches to the gemini or aimlapi factory based
 * on `LLM_PROVIDER`. Recommended entry point for application code — switching
 * providers becomes an env change, not a code change.
 */
export function createBuyerAgentFromEnv(
  overrides: { config?: BuyerAgentConfig } = {},
): BuyerAgent {
  const config = overrides.config ?? loadBuyerConfig();
  return config.LLM_PROVIDER === "gemini"
    ? createBuyerAgentWithGemini({ config })
    : createBuyerAgentWithAimlApi({ config });
}
