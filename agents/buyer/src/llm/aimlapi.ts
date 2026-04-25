import type { LlmAdapter, LlmDecision } from "../agent.js";
import type { AgentTool } from "../tools/types.js";

import { zodToJsonSchema } from "./zodToJsonSchema.js";

export interface AimlApiLlmAdapterConfig {
  apiKey: string;
  model: string;
  tools: ReadonlyArray<AgentTool<unknown, unknown>>;
  /** OpenAI-compatible chat-completions base URL. Defaults to AIMLAPI prod. */
  baseUrl?: string;
  /** Test seam for unit coverage. */
  fetchImpl?: typeof fetch;
}

interface OpenAiToolSpec {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: unknown;
  };
}

interface OpenAiAssistantToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenAiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: OpenAiAssistantToolCall[];
  tool_call_id?: string;
}

interface OpenAiChoice {
  message: {
    role: "assistant";
    content: string | null;
    tool_calls?: OpenAiAssistantToolCall[];
  };
  finish_reason?: string;
}

interface OpenAiResponse {
  choices?: OpenAiChoice[];
  error?: { message?: string };
}

/**
 * OpenAI chat-completions adapter — points at AIMLAPI by default. AIMLAPI
 * proxies to `google/gemini-*` server-side, so the on-wire model is still
 * Gemini; only the transport / billing changes.
 *
 * State model: the OpenAI format requires tool responses to reference the
 * `tool_call_id` from the preceding assistant turn. We can't reconstruct that
 * from the agent loop's string-only history, so the adapter keeps its own
 * `accumulated` message list and resets it whenever the loop starts a fresh
 * run (single `user` message).
 */
export function createAimlApiLlmAdapter(config: AimlApiLlmAdapterConfig): LlmAdapter {
  const fetcher = config.fetchImpl ?? fetch;
  const baseUrl = config.baseUrl ?? "https://api.aimlapi.com/v1";

  const openAiTools: OpenAiToolSpec[] = config.tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: zodToJsonSchema(tool.inputSchema),
    },
  }));

  let accumulated: OpenAiMessage[] = [];
  let pendingToolCall: OpenAiAssistantToolCall | null = null;

  return {
    async step({ system, messages }): Promise<LlmDecision<string>> {
      const last = messages[messages.length - 1];
      if (!last) {
        throw new Error("AimlApiLlmAdapter: empty message history");
      }

      if (messages.length === 1 && last.role === "user") {
        accumulated = [
          { role: "system", content: system },
          { role: "user", content: last.content },
        ];
        pendingToolCall = null;
      } else if (last.role === "tool") {
        if (!pendingToolCall) {
          throw new Error(
            "AimlApiLlmAdapter: received tool message before an assistant tool_call was recorded",
          );
        }
        let payload: { tool: string; out: unknown };
        try {
          payload = JSON.parse(last.content) as { tool: string; out: unknown };
        } catch {
          throw new Error("AimlApiLlmAdapter: malformed tool message content");
        }
        accumulated.push({
          role: "tool",
          tool_call_id: pendingToolCall.id,
          content: JSON.stringify(payload.out ?? null),
        });
      } else {
        throw new Error(
          `AimlApiLlmAdapter: unexpected final message role "${last.role}"`,
        );
      }

      const res = await fetcher(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: accumulated,
          tools: openAiTools,
          tool_choice: "auto",
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(
          `AimlApiLlmAdapter: ${res.status} ${res.statusText} — ${detail.slice(0, 500)}`,
        );
      }

      const data = (await res.json()) as OpenAiResponse;
      const choice = data.choices?.[0]?.message;
      if (!choice) {
        throw new Error(
          `AimlApiLlmAdapter: response missing choices[0].message (${JSON.stringify(data).slice(0, 200)})`,
        );
      }

      const toolCalls = choice.tool_calls;
      const call = toolCalls?.[0];
      if (call) {
        accumulated.push({
          role: "assistant",
          // Reason: AIMLAPI's validator rejects `content: null` on assistant
          // turns with tool_calls, even though the OpenAI spec allows it.
          content: choice.content ?? "",
          tool_calls: [call],
        });
        pendingToolCall = call;
        let args: unknown;
        try {
          args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        } catch {
          throw new Error(
            `AimlApiLlmAdapter: tool_call.arguments is not valid JSON: ${call.function.arguments}`,
          );
        }
        return { toolCall: { name: call.function.name, args } };
      }

      return { final: choice.content ?? "" };
    },
  };
}
