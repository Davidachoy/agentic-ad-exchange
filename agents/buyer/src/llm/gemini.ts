import {
  FunctionCallingMode,
  GoogleGenerativeAI,
  type ChatSession,
  type Content,
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
  /**
   * If set, the FIRST turn of a fresh agent run is configured with
   * `FunctionCallingMode.ANY` and `allowedFunctionNames: [forceFirstToolCall]`,
   * so Gemini cannot answer with text — it must call this tool. Subsequent
   * turns switch back to AUTO so the model can produce a final text response.
   *
   * Use for single-purpose agents (e.g. seller's listInventory loop) where
   * the AUTO-mode "answers in text instead of calling the tool" failure mode
   * silently kills cycles.
   */
  forceFirstToolCall?: string;
  /**
   * Number of retries for transient Gemini errors (503 / 429 / "high demand").
   * Defaults to 3. Backoff: 1s → 2s → 4s.
   */
  maxRetries?: number;
}

/** Structural subset of `GoogleGenerativeAI` we actually touch — used for mocking. */
export interface GoogleGenerativeAIClient {
  getGenerativeModel: GoogleGenerativeAI["getGenerativeModel"];
}

const TRANSIENT_ERROR_RE =
  /\b(503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand|Service Unavailable)\b/i;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Bridge `LlmAdapter` ← `@google/generative-ai`.
 *
 * Each tool becomes a Gemini `FunctionDeclaration`, carrying the existing
 * `description` verbatim (the LLM selects tools from descriptions alone, per
 * CLAUDE.md § Agent Framework Rules).
 *
 * The adapter keeps a single `ChatSession` so that Gemini sees a coherent
 * sequence of user → functionCall → functionResponse turns. When the agent
 * loop starts a fresh run (`messages.length === 1 && role === "user"`) we
 * reset the session.
 *
 * If `forceFirstToolCall` is set, the first turn uses ANY mode (forced tool
 * call) and the second turn rebuilds the session with AUTO mode (preserving
 * history) so the model can produce a final text answer.
 */
export function createGeminiLlmAdapter(config: GeminiLlmAdapterConfig): LlmAdapter {
  const factory =
    config.clientFactory ??
    ((apiKey: string) => new GoogleGenerativeAI(apiKey) as GoogleGenerativeAIClient);
  const client = factory(config.apiKey);
  const maxRetries = config.maxRetries ?? 3;

  const functionDeclarations: FunctionDeclaration[] = config.tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: zodToGeminiSchema(tool.inputSchema) as FunctionDeclarationSchema,
  }));

  let chat: ChatSession | null = null;
  let firstTurnForced = false;

  function buildModel(system: string, mode: "auto" | "forced"): GenerativeModel {
    const functionCallingConfig =
      mode === "forced" && config.forceFirstToolCall
        ? {
            mode: FunctionCallingMode.ANY,
            allowedFunctionNames: [config.forceFirstToolCall],
          }
        : { mode: FunctionCallingMode.AUTO };
    return client.getGenerativeModel({
      model: config.model,
      systemInstruction: system,
      tools: [{ functionDeclarations }],
      toolConfig: { functionCallingConfig },
    });
  }

  // Bounded retry: at most `maxRetries + 1` attempts. Each iteration either
  // returns on success or throws (if the error isn't transient or we're out
  // of retries). The unreachable throw at the end is a TS exhaustiveness pin.
  async function sendWithRetry(
    parts: Array<string | Part>,
  ): Promise<Awaited<ReturnType<ChatSession["sendMessage"]>>> {
    if (!chat) throw new Error("GeminiLlmAdapter: chat session not initialized");
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        return await chat.sendMessage(parts);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const transient = TRANSIENT_ERROR_RE.test(msg);
        if (!transient || attempt === maxRetries) throw err;
        await sleep(1000 * 2 ** attempt);
      }
    }
    throw new Error("GeminiLlmAdapter: retry loop exhausted (unreachable)");
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
        const useForced = Boolean(config.forceFirstToolCall);
        const model = buildModel(system, useForced ? "forced" : "auto");
        chat = model.startChat();
        firstTurnForced = useForced;
        parts = [last.content];
      } else if (last.role === "tool") {
        if (!chat) {
          throw new Error(
            "GeminiLlmAdapter: received tool message before chat was initialized",
          );
        }
        // If turn 1 used ANY-mode (forced), rebuild the session in AUTO mode
        // so the model can produce a final text response now that the tool
        // has run. History is preserved so Gemini still sees turn 1.
        if (firstTurnForced) {
          const history: Content[] = await chat.getHistory();
          const model = buildModel(system, "auto");
          chat = model.startChat({ history });
          firstTurnForced = false;
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

      const result = await sendWithRetry(parts);
      const calls = result.response.functionCalls();
      const call = calls?.[0];
      if (call) {
        return { toolCall: { name: call.name, args: call.args ?? {} } };
      }
      return { final: result.response.text() };
    },
  };
}
