import {
  FunctionCallingMode,
  GoogleGenerativeAI,
  type ChatSession,
  type FunctionDeclaration,
  type FunctionDeclarationSchema,
  type GenerativeModel,
  type Part,
} from "@google/generative-ai";

import type { LlmAdapter, LlmDecision } from "../agent.js";
import type { AgentTool } from "../tools/types.js";

import { zodToGeminiSchema } from "./zodToGeminiSchema.js";

export interface GeminiLlmAdapterConfig {
  apiKey: string;
  model: string;
  tools: ReadonlyArray<AgentTool<unknown, unknown>>;
  /**
   * Test seam — lets a mock stand in for `new GoogleGenerativeAI(apiKey)` so
   * unit tests can assert on function-declaration wiring without a real HTTP
   * call. Production callers should leave this undefined.
   */
  clientFactory?: (apiKey: string) => GoogleGenerativeAIClient;
}

/** Structural subset of `GoogleGenerativeAI` we actually touch — used for mocking. */
export interface GoogleGenerativeAIClient {
  getGenerativeModel: GoogleGenerativeAI["getGenerativeModel"];
}

/**
 * Bridge `LlmAdapter` ← `@google/generative-ai`.
 *
 * Each buyer-agent tool becomes a Gemini `FunctionDeclaration`, carrying the
 * existing `description` verbatim (the LLM selects tools from descriptions
 * alone, per CLAUDE.md § Agent Framework Rules).
 *
 * The adapter keeps a single `ChatSession` so that Gemini sees a coherent
 * sequence of user → functionCall → functionResponse turns. When the agent
 * loop starts a fresh run (`messages.length === 1 && role === "user"`) we
 * reset the session.
 */
export function createGeminiLlmAdapter(config: GeminiLlmAdapterConfig): LlmAdapter {
  const factory =
    config.clientFactory ??
    ((apiKey: string) => new GoogleGenerativeAI(apiKey) as GoogleGenerativeAIClient);
  const client = factory(config.apiKey);

  const functionDeclarations: FunctionDeclaration[] = config.tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: zodToGeminiSchema(tool.inputSchema) as FunctionDeclarationSchema,
  }));

  let model: GenerativeModel | null = null;
  let chat: ChatSession | null = null;

  function resetSession(system: string): void {
    model = client.getGenerativeModel({
      model: config.model,
      systemInstruction: system,
      tools: [{ functionDeclarations }],
      toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
    });
    chat = model.startChat();
  }

  return {
    async step({ system, messages }): Promise<LlmDecision<string>> {
      const last = messages[messages.length - 1];
      if (!last) {
        throw new Error("GeminiLlmAdapter: empty message history");
      }

      let parts: Array<string | Part>;

      if (messages.length === 1 && last.role === "user") {
        // Fresh agent run — start a new Gemini chat each time so tests and
        // repeat runs don't leak state from a prior conversation.
        resetSession(system);
        parts = [last.content];
      } else if (last.role === "tool") {
        if (!chat) {
          throw new Error(
            "GeminiLlmAdapter: received tool message before chat was initialized",
          );
        }
        let payload: { tool: string; out: unknown };
        try {
          payload = JSON.parse(last.content) as { tool: string; out: unknown };
        } catch {
          throw new Error("GeminiLlmAdapter: malformed tool message content");
        }
        if (typeof payload.tool !== "string") {
          throw new Error("GeminiLlmAdapter: tool message missing tool name");
        }
        parts = [
          {
            functionResponse: {
              name: payload.tool,
              response: (payload.out ?? {}) as object,
            },
          },
        ];
      } else {
        throw new Error(
          `GeminiLlmAdapter: unexpected final message role "${last.role}"`,
        );
      }

      if (!chat) {
        throw new Error("GeminiLlmAdapter: chat session not initialized");
      }

      const result = await chat.sendMessage(parts);
      const calls = result.response.functionCalls();
      const call = calls?.[0];
      if (call) {
        return { toolCall: { name: call.name, args: call.args ?? {} } };
      }
      return { final: result.response.text() };
    },
  };
}
