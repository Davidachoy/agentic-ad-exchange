import type { AssistantChatMessage, DashboardAssistantContext } from "@ade/shared";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM = `You are Atlas, the in-app assistant for the Agentic Ad Exchange demo: autonomous ad auctions on Arc with sub-cent USDC (Circle nanopayments / DCW). You only advise about this dashboard: listings, bids, auctions, settlements, pause state, and sensible next steps. Be concise, actionable, and accurate. If the user asks for something outside exchange scope, politely redirect. Never invent wallet balances or tx hashes not present in the context JSON.`;

export interface GeminiReplyDeps {
  apiKey: string;
  model: string;
}

function formatTranscript(messages: AssistantChatMessage[]): string {
  return messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
}

/**
 * Stateless turn: full message history + context in one prompt (UI resends history each call).
 */
export async function generateAssistantReply(
  deps: GeminiReplyDeps,
  messages: AssistantChatMessage[],
  context: DashboardAssistantContext,
): Promise<string> {
  const client = new GoogleGenerativeAI(deps.apiKey);
  const model = client.getGenerativeModel({
    model: deps.model,
    systemInstruction: SYSTEM,
  });

  if (messages.length === 0) {
    throw new Error("no_messages");
  }
  const last = messages[messages.length - 1];
  if (last?.role !== "user") {
    throw new Error("last_turn_must_be_user");
  }

  const prompt = `Dashboard context (JSON):\n${JSON.stringify(context, null, 2)}\n\n---\n\nConversation:\n${formatTranscript(messages)}\n\n---\n\nReply as Atlas for the last USER message. Use markdown sparingly (short bullets OK).`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("empty_model_response");
  }
  return text.trim();
}
