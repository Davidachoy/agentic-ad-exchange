import type {
  AssistantChatMessage,
  AssistantChatResponse,
  DashboardAssistantContext,
} from "@ade/shared";
import { parseAssistantChatResponse } from "@ade/shared";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Logger } from "pino";

import { atlasAssistantResponseGeminiSchema } from "./atlasGeminiResponseSchema.js";

const SYSTEM = `You are Atlas, the in-app assistant for the Agentic Ad Exchange demo: autonomous ad auctions on Arc with sub-cent USDC (Circle nanopayments / DCW). You only advise about this dashboard: listings, bids, auctions, settlements, pause state, and sensible next steps. Be concise, actionable, and accurate. If the user asks for something outside exchange scope, politely redirect.

Respond in the same language as the user's latest message (Spanish or English, etc.).

Output must be a single JSON object only (no markdown fences). Fields:
- "reply": short markdown-friendly string for the chat bubble.
- "blocks" (optional, max 5): rich UI cards. Each block has "type" and type-specific fields:
  - "metrics_strip": { "type": "metrics_strip", "items": [ { "label", "value", "dataSource" } ] } where dataSource is "exchange" for facts taken from the dashboard context JSON, or "simulated" for illustrative demo KPIs (VCR, win rate, burn, etc.) that are NOT in the snapshot.
  - "pill_group": { "type": "pill_group", "sectionTitle", "pills": [ { "text", "variant" } ] } variant is "new" | "kept" | "neutral".
  - "decision": { "type": "decision", "headline", "summary", "reasoning" (string array), "rejected" ( { "action", "reason" } array ), optional "complianceNote", optional "badge" }.
  - "bar_chart": { "type": "bar_chart", "title", optional "subtitle", optional "yCaption", "dataSource", "points": [ { "label", "value" } ] } — use when the user asks for a chart, graph, plot, or visualization (including Spanish: gráfico, chart, barras). Up to 14 points; "value" must be a non-negative number (counts or relative amounts). Prefer "exchange" when points are derived directly from context fields (e.g. bid amounts grouped by buyerAgentId, listing floor prices); use "simulated" only for illustrative series not in the JSON.

When the user asks how ads/campaigns/posts are performing, include helpful blocks. Use "simulated" for any metric not literally present in the context JSON. Never invent transaction hashes, wallet secrets, or Circle entity details.`;

export interface GeminiReplyDeps {
  apiKey: string;
  model: string;
  /** When set, logs Gemini phases (use LOG_LEVEL=debug to see debug lines). */
  logger?: Logger;
}

function formatTranscript(messages: AssistantChatMessage[]): string {
  return messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
}

/** Keeps the tail of the thread for the model; starts on a USER turn when possible. */
function capAssistantMessagesForPrompt(
  msgs: AssistantChatMessage[],
  maxMessages: number,
): AssistantChatMessage[] {
  if (msgs.length <= maxMessages) return msgs;
  let start = Math.max(0, msgs.length - maxMessages);
  while (start > 0 && start < msgs.length && msgs[start]?.role !== "user") {
    start += 1;
  }
  return msgs.slice(start);
}

/** Fails the await if `promise` does not settle by `ms` (backup when SDK ignores AbortSignal). */
function withHardDeadline<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let tid: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    tid = setTimeout(() => reject(new Error(label)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => {
    if (tid !== undefined) {
      clearTimeout(tid);
    }
  }) as Promise<T>;
}

/**
 * Stateless turn: full message history + context in one prompt (UI resends history each call).
 * Returns structured reply + optional UI blocks (validated with shared zod helpers).
 */
export async function generateAssistantReply(
  deps: GeminiReplyDeps,
  messages: AssistantChatMessage[],
  context: DashboardAssistantContext,
): Promise<AssistantChatResponse> {
  const client = new GoogleGenerativeAI(deps.apiKey);
  const model = client.getGenerativeModel({
    model: deps.model,
    systemInstruction: SYSTEM,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: atlasAssistantResponseGeminiSchema,
    },
  });

  if (messages.length === 0) {
    throw new Error("no_messages");
  }
  const cappedMessages = capAssistantMessagesForPrompt(messages, 32);
  const last = cappedMessages[cappedMessages.length - 1];
  if (last?.role !== "user") {
    throw new Error("last_turn_must_be_user");
  }

  const prompt = `Dashboard context (JSON):\n${JSON.stringify(context, null, 2)}\n\n---\n\nConversation:\n${formatTranscript(cappedMessages)}\n\n---\n\nReply as JSON for the last USER message. Use "blocks" when charts (bar_chart), metrics strips, policy-style pills, or decision explainers would help. Keep "reply" under ~600 characters when possible.`;

  const log = deps.logger?.child({ mod: "assistant.gemini" });
  const genStart = Date.now();
  log?.debug({ model: deps.model, promptChars: prompt.length }, "assistant_gemini_generateContent_call");

  // Reason: logs showed HTTP open with no completion while Gemini ran; cap wait so Express returns 502 and the UI can show offline fallback instead of a blank thread for minutes.
  const geminiDeadlineMs = 55_000;
  const timeoutSignal = AbortSignal.timeout(geminiDeadlineMs);

  let result: Awaited<ReturnType<typeof model.generateContent>>;
  try {
    result = await withHardDeadline(
      model.generateContent(prompt, { signal: timeoutSignal }),
      geminiDeadlineMs,
      "assistant_gemini_hard_deadline",
    );
  } catch (gemErr) {
    throw gemErr;
  }

  const rawText = result.response.text();
  const genMs = Date.now() - genStart;
  log?.info(
    {
      genMs,
      rawChars: rawText?.length ?? 0,
      promptTokens: result.response.usageMetadata?.promptTokenCount,
      outputTokens: result.response.usageMetadata?.candidatesTokenCount,
    },
    "assistant_gemini_generateContent_done",
  );

  if (!rawText?.trim()) {
    log?.warn({ genMs }, "assistant_gemini_empty_model_response");
    throw new Error("empty_model_response");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText) as unknown;
  } catch (parseErr) {
    log?.warn({ genMs, err: parseErr, rawPreview: rawText.slice(0, 200) }, "assistant_gemini_invalid_json");
    throw new Error("invalid_model_json");
  }

  const parsed = parseAssistantChatResponse(parsedJson);
  if (!parsed.reply.trim()) {
    const fallback = rawText.trim().slice(0, 4000);
    return {
      reply:
        fallback.length > 0
          ? fallback
          : "I could not produce a text reply for that question. Please try rephrasing, or ask for a shorter summary.",
      blocks: parsed.blocks,
    };
  }
  return parsed;
}
