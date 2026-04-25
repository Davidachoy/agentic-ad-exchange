import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { AgentTool } from "../tools/types.js";

import { createAimlApiLlmAdapter } from "./aimlapi.js";

interface ScriptedReply {
  status?: number;
  body: unknown;
}

function mockFetch(replies: ScriptedReply[]) {
  let index = 0;
  return vi.fn(async (_url: string, _init: RequestInit | undefined) => {
    const reply = replies[index];
    index += 1;
    if (!reply) throw new Error("mock fetch: scripted replies exhausted");
    return new Response(JSON.stringify(reply.body), {
      status: reply.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
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

describe("createAimlApiLlmAdapter", () => {
  it("returns a tool call when the response includes tool_calls (happy)", async () => {
    const fetchImpl = mockFetch([
      {
        body: {
          choices: [
            {
              message: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "tc-1",
                    type: "function",
                    function: {
                      name: "checkBalance",
                      arguments: '{"walletId":"w-1"}',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ]);
    const adapter = createAimlApiLlmAdapter({
      apiKey: "test-key",
      model: "google/gemini-2.0-flash",
      tools: [echoTool],
      fetchImpl,
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

    const init = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.tools[0].function.name).toBe("checkBalance");
    expect(body.tools[0].function.parameters.required).toEqual(["walletId"]);
    expect(body.messages[0]).toEqual({ role: "system", content: "sys" });
  });

  it("carries tool_call_id across turns into a final answer (edge)", async () => {
    const fetchImpl = mockFetch([
      {
        body: {
          choices: [
            {
              message: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "tc-42",
                    type: "function",
                    function: {
                      name: "checkBalance",
                      arguments: '{"walletId":"w-1"}',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        body: {
          choices: [
            {
              message: { role: "assistant", content: "Balance is 0.1 USDC." },
            },
          ],
        },
      },
    ]);
    const adapter = createAimlApiLlmAdapter({
      apiKey: "test-key",
      model: "google/gemini-2.0-flash",
      tools: [echoTool],
      fetchImpl,
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

    expect(decision.final).toBe("Balance is 0.1 USDC.");
    const secondInit = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[1][1] as RequestInit;
    const secondBody = JSON.parse(secondInit.body as string);
    const toolMsg = secondBody.messages[secondBody.messages.length - 1];
    expect(toolMsg).toEqual({
      role: "tool",
      tool_call_id: "tc-42",
      content: JSON.stringify({ walletId: "w-1", usdc: "0.100000" }),
    });
  });

  it("surfaces HTTP errors from the upstream API (failure)", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("Unauthorized: bad token", {
          status: 401,
          statusText: "Unauthorized",
        }),
    ) as unknown as typeof fetch;
    const adapter = createAimlApiLlmAdapter({
      apiKey: "test-key",
      model: "google/gemini-2.0-flash",
      tools: [echoTool],
      fetchImpl,
    });

    await expect(
      adapter.step({
        system: "sys",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toThrow(/401|Unauthorized/);
  });
});
