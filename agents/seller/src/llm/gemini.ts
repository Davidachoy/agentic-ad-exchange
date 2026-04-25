import {
  createGeminiLlmAdapter,
  type GeminiLlmAdapterConfig,
  type GoogleGenerativeAIClient,
} from "@ade/agent-buyer";

// Reason: re-export rather than recreate the adapter so seller call-sites stay
// scoped to this package boundary while the implementation lives in a single
// place (CLAUDE.md § Code Structure & Modularity — barrel exports at each
// package boundary, no copy-pasted Gemini glue).
export { createGeminiLlmAdapter };
export type { GeminiLlmAdapterConfig, GoogleGenerativeAIClient };
