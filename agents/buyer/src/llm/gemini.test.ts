import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { AgentTool } from "../tools/types.js";

import { createGeminiLlmAdapter, type GoogleGenerativeAIClient } from "./gemini.js";

interface ScriptedReply {
  calls?: Array<{ name: string; args: unknown }>;
  text?: string;
}

/** Minimal Gemini SDK stand-in — matches the surface `gemini.ts` actually calls. */
function mockClient(replies: ScriptedReply[]): {
  client: GoogleGenerativeAIClient;
  sendMessage: ReturnType<typeof vi.fn>;
  getGenerativeModel: ReturnType<typeof vi.fn>;
} {
  let index = 0;
  const sendMessage = vi.fn(async () => {
    const reply = replies[index];
    index += 1;
    if (!reply) throw new Error("mock gemini: scripted replies exhausted");
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
    sendMessage,
    getGenerativeModel,
  };
}

const echoTool: AgentTool<{ walletId: string }, { walletId: string; usdc: string }> = {
  name: "checkBalance",
  description: "Read the buyer wallet's on-chain USDC balance.",
  inputSchema: z.object({ walletId: z.string().min(1) }),
  outputSchema: z.object({ walletId: z.string().min(1), usdc: z.string() }),
  async invoke(input) {
    return { walletId: input.walletId, usdc: "0.100000" };
  },
};

describe("createGeminiLlmAdapter", () => {
  it("returns a tool call when Gemini emits functionCalls (happy)", async () => {
    const { client, getGenerativeModel, sendMessage } = mockClient([
      { calls: [{ name: "checkBalance", args: { walletId: "w-1" } }] },
    ]);
    const adapter = createGeminiLlmAdapter({
      apiKey: "test-key",
      model: "gemini-1.5-flash",
      tools: [echoTool],
      clientFactory: () => client,
    });

    const decision = await adapter.step({
      system: "sys",
      messages: [{ role: "user", content: "check my balance" }],
    });

    expect(decision.toolCall).toEqual({
      name: "checkBalance",
      args: { walletId: "w-1" },
    });
    expect(decision.final).toBeUndefined();

    // function declarations built from the tool's zod input schema
    const modelArgs = getGenerativeModel.mock.calls[0][0] as {
      tools: Array<{ functionDeclarations: Array<{ name: string }> }>;
      systemInstruction: string;
    };
    expect(modelArgs.tools[0].functionDeclarations[0].name).toBe("checkBalance");
    expect(modelArgs.systemInstruction).toBe("sys");
    expect(sendMessage).toHaveBeenCalledOnce();
  });

  it("translates a follow-up tool message into a Gemini functionResponse (edge)", async () => {
    const { client, sendMessage } = mockClient([
      { calls: [{ name: "checkBalance", args: { walletId: "w-1" } }] },
      { text: "All good — balance is 0.1 USDC." },
    ]);
    const adapter = createGeminiLlmAdapter({
      apiKey: "test-key",
      model: "gemini-1.5-flash",
      tools: [echoTool],
      clientFactory: () => client,
    });

    await adapter.step({
      system: "sys",
      messages: [{ role: "user", content: "check balance" }],
    });

    const decision = await adapter.step({
      system: "sys",
      messages: [
        { role: "user", content: "check balance" },
        {
          role: "tool",
          content: JSON.stringify({
            tool: "checkBalance",
            out: { walletId: "w-1", usdc: "0.100000" },
          }),
        },
      ],
    });

    expect(decision.final).toBe("All good — balance is 0.1 USDC.");
    expect(decision.toolCall).toBeUndefined();

    const secondCallArgs = sendMessage.mock.calls[1][0] as Array<{
      functionResponse?: { name: string; response: unknown };
    }>;
    expect(secondCallArgs[0].functionResponse).toEqual({
      name: "checkBalance",
      response: { walletId: "w-1", usdc: "0.100000" },
    });
  });

  it("throws when the last message has an unsupported role (failure)", async () => {
    const { client } = mockClient([]);
    const adapter = createGeminiLlmAdapter({
      apiKey: "test-key",
      model: "gemini-1.5-flash",
      tools: [echoTool],
      clientFactory: () => client,
    });

    await expect(
      adapter.step({
        system: "sys",
        messages: [
          { role: "user", content: "first" },
          { role: "assistant", content: "huh" },
        ],
      }),
    ).rejects.toThrow(/unexpected final message role/);
  });
});
