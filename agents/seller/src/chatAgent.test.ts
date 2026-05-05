import { FunctionCallingMode } from "@google/generative-ai";
import { describe, expect, it, vi } from "vitest";

import { SELLER_CHAT_SYSTEM_PROMPT } from "./chatPrompt.js";
import type { GoogleGenerativeAIClient } from "./llm/gemini.js";
import { createListInventoryTool } from "./tools/index.js";

import {
  createSellerChatAgentWithGemini,
  MAX_TOOL_CALLS_PER_TURN,
  wrapWithFloorCap,
} from "./index.js";

interface ScriptedReply {
  calls?: Array<{ name: string; args: unknown }>;
  text?: string;
}

function mockGeminiClient(replies: ScriptedReply[]): {
  client: GoogleGenerativeAIClient;
  getGenerativeModel: ReturnType<typeof vi.fn>;
  sendMessage: ReturnType<typeof vi.fn>;
} {
  let i = 0;
  const sendMessage = vi.fn(async () => {
    const reply = replies[i];
    i += 1;
    if (!reply) throw new Error("mock gemini exhausted");
    return {
      response: {
        functionCalls: () => reply.calls,
        text: () => reply.text ?? "",
      },
    };
  });
  const startChat = vi.fn(() => ({ sendMessage }));
  const getGenerativeModel = vi.fn(() => ({ startChat }));
  return {
    client: { getGenerativeModel } as unknown as GoogleGenerativeAIClient,
    getGenerativeModel,
    sendMessage,
  };
}

const SELLER_WALLET = `0x${"3".padStart(40, "0")}`;
const baseConfig = {
  GEMINI_API_KEY: "test-key",
  GEMINI_MODEL: "gemini-2.5-flash",
  EXCHANGE_API_URL: "http://exchange",
  SELLER_WALLET_ADDRESS: SELLER_WALLET,
  SELLER_LISTING_INTERVAL_MS: 30_000,
};

describe("createSellerChatAgentWithGemini", () => {
  it("exposes the chat tool set in canonical order and uses SELLER_CHAT_SYSTEM_PROMPT (happy)", async () => {
    const { client, getGenerativeModel } = mockGeminiClient([{ text: "Hello." }]);
    const agent = createSellerChatAgentWithGemini({
      config: baseConfig,
      clientFactory: () => client,
    });
    expect(agent.tools.map((t) => t.name)).toEqual([
      "listInventory",
      "runAuction",
      "serveAd",
      "viewHistory",
    ]);

    await agent.run("hi");
    const modelArgs = getGenerativeModel.mock.calls[0][0] as {
      systemInstruction: string;
      toolConfig: { functionCallingConfig: { mode: FunctionCallingMode } };
    };
    expect(modelArgs.systemInstruction).toBe(SELLER_CHAT_SYSTEM_PROMPT);
    // Reason: AUTO mode is required so the model picks tools from user intent
    // rather than being force-funneled into one. The pure-listInventory loop
    // (`createSellerAgentWithGemini`) uses ANY-mode forced-call; chat must not.
    expect(modelArgs.toolConfig.functionCallingConfig.mode).toBe(FunctionCallingMode.AUTO);
  });

  it("rejects floors above MAX_CLEARING_PRICE_USDC before POSTing (edge)", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ listingId: "x" }), { status: 201 }),
    );
    const wrapped = wrapWithFloorCap(
      createListInventoryTool({
        exchangeUrl: "http://exchange",
        sellerAgentId: "seller-1",
        sellerWallet: SELLER_WALLET,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    );

    await expect(
      wrapped.invoke({
        adType: "display",
        format: "banner",
        size: "300x250",
        contextualExclusions: [],
        floorPriceUsdc: "0.011",
      }),
    ).rejects.toThrow(/exceeds.+0\.01/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("does not pass forceFirstToolCall to the Gemini adapter (failure)", async () => {
    // If the adapter were given forceFirstToolCall, getGenerativeModel would
    // receive `toolConfig.functionCallingConfig.mode === ANY` on the first call.
    const { client, getGenerativeModel } = mockGeminiClient([{ text: "ok" }]);
    const agent = createSellerChatAgentWithGemini({
      config: baseConfig,
      clientFactory: () => client,
    });

    await agent.run("anything");
    const modelArgs = getGenerativeModel.mock.calls[0][0] as {
      toolConfig: { functionCallingConfig: { mode: FunctionCallingMode } };
    };
    expect(modelArgs.toolConfig.functionCallingConfig.mode).not.toBe(FunctionCallingMode.ANY);
    expect(MAX_TOOL_CALLS_PER_TURN).toBe(2);
  });
});
