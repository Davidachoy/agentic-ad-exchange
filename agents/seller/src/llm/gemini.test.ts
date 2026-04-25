import { AdInventoryListingSchema, type AdInventoryListing } from "@ade/shared";
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

const wallet = (s: string): string => `0x${s.padStart(40, "0")}`;

const listing: AdInventoryListing = {
  listingId: "11111111-1111-4111-8111-111111111111",
  sellerAgentId: "seller-1",
  sellerWallet: wallet("1"),
  adType: "display",
  format: "banner",
  size: "300x250",
  contextualExclusions: [],
  floorPriceUsdc: "0.001",
  createdAt: "2026-04-22T12:00:00Z",
};

const ListInventoryOutput = z.object({
  listingId: z.string().uuid(),
  accepted: z.boolean(),
});

const listInventoryTool: AgentTool<AdInventoryListing, z.infer<typeof ListInventoryOutput>> = {
  name: "listInventory",
  description:
    "Register an ad inventory listing with the Exchange (ad type, format, size, floor price, contextual exclusions).",
  inputSchema: AdInventoryListingSchema,
  outputSchema: ListInventoryOutput,
  async invoke(input) {
    return { listingId: input.listingId, accepted: true };
  },
};

describe("createGeminiLlmAdapter (seller)", () => {
  it("returns a tool call when Gemini emits functionCalls (happy)", async () => {
    const { client, getGenerativeModel, sendMessage } = mockClient([
      { calls: [{ name: "listInventory", args: listing }] },
    ]);
    const adapter = createGeminiLlmAdapter({
      apiKey: "test-key",
      model: "gemini-1.5-flash",
      tools: [listInventoryTool],
      clientFactory: () => client,
    });

    const decision = await adapter.step({
      system: "sys",
      messages: [{ role: "user", content: "list a 300x250 banner with floor 0.001" }],
    });

    expect(decision.toolCall).toEqual({ name: "listInventory", args: listing });
    expect(decision.final).toBeUndefined();

    // function declarations built from the tool's zod input schema
    const modelArgs = getGenerativeModel.mock.calls[0][0] as {
      tools: Array<{ functionDeclarations: Array<{ name: string }> }>;
      systemInstruction: string;
    };
    expect(modelArgs.tools[0].functionDeclarations[0].name).toBe("listInventory");
    expect(modelArgs.systemInstruction).toBe("sys");
    expect(sendMessage).toHaveBeenCalledOnce();
  });

  it("translates a follow-up tool message into a Gemini functionResponse (edge)", async () => {
    const { client, sendMessage } = mockClient([
      { calls: [{ name: "listInventory", args: listing }] },
      { text: "Listed." },
    ]);
    const adapter = createGeminiLlmAdapter({
      apiKey: "test-key",
      model: "gemini-1.5-flash",
      tools: [listInventoryTool],
      clientFactory: () => client,
    });

    await adapter.step({
      system: "sys",
      messages: [{ role: "user", content: "list inventory" }],
    });

    const decision = await adapter.step({
      system: "sys",
      messages: [
        { role: "user", content: "list inventory" },
        {
          role: "tool",
          content: JSON.stringify({
            tool: "listInventory",
            out: { listingId: listing.listingId, accepted: true },
          }),
        },
      ],
    });

    expect(decision.final).toBe("Listed.");
    expect(decision.toolCall).toBeUndefined();

    const secondCallArgs = sendMessage.mock.calls[1][0] as Array<{
      functionResponse?: { name: string; response: unknown };
    }>;
    expect(secondCallArgs[0].functionResponse).toEqual({
      name: "listInventory",
      response: { listingId: listing.listingId, accepted: true },
    });
  });

  it("throws when the last message has an unsupported role (failure)", async () => {
    const { client } = mockClient([]);
    const adapter = createGeminiLlmAdapter({
      apiKey: "test-key",
      model: "gemini-1.5-flash",
      tools: [listInventoryTool],
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
