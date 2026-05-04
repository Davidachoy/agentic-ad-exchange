import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { postSellerAssistantChat, type AssistantChatHttpError } from "../api/client.js";
import { getSimulatedSellerReply } from "../assistant/sellerComposerSimulation.js";

import { useSellerAssistantChat } from "./useSellerAssistantChat.js";

// Reason: vitest hoists vi.mock above all imports automatically, so this stub
// runs before postSellerAssistantChat resolves to the real module.
vi.mock("../api/client.js", () => ({
  postSellerAssistantChat: vi.fn(),
  ASSISTANT_FETCH_DEADLINE_MS: 130_000,
}));

describe("useSellerAssistantChat", () => {
  beforeEach(() => {
    vi.mocked(postSellerAssistantChat).mockReset();
  });

  it("posts the composer message and renders the model reply with blocks (happy)", async () => {
    vi.mocked(postSellerAssistantChat).mockResolvedValueOnce({
      reply: "Floor draft captured.",
      blocks: [
        {
          type: "metrics_strip",
          items: [{ label: "Floor", value: "$3", dataSource: "simulated" }],
        },
      ],
    });

    const { result } = renderHook(() => useSellerAssistantChat());
    expect(result.current.sending).toBe(false);

    act(() => {
      result.current.sendComposerMessage("set CTV pre-roll to $3", "set_floor");
    });

    expect(result.current.sending).toBe(true);
    await waitFor(() => expect(result.current.sending).toBe(false));

    const last = result.current.messages.at(-1)!;
    expect(last.role).toBe("assistant");
    expect(last.content).toBe("Floor draft captured.");
    expect(last.usedFallback).not.toBe(true);
    expect(last.blocks).toHaveLength(1);
    expect(last.blocks?.[0]?.type).toBe("metrics_strip");

    expect(vi.mocked(postSellerAssistantChat)).toHaveBeenCalledTimes(1);
    const [body] = vi.mocked(postSellerAssistantChat).mock.calls[0]!;
    expect(body.role).toBe("seller");
    expect(body.mode).toBe("set_floor");
  });

  it("cancels an in-flight request and posts 'Request cancelled.' (edge)", async () => {
    vi.mocked(postSellerAssistantChat).mockImplementationOnce(
      (_body, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    const { result } = renderHook(() => useSellerAssistantChat());

    act(() => {
      result.current.sendComposerMessage("anything", "ask");
    });
    expect(result.current.sending).toBe(true);

    act(() => {
      result.current.cancelPendingGeneration();
    });

    await waitFor(() => expect(result.current.sending).toBe(false));

    const last = result.current.messages.at(-1)!;
    expect(last.role).toBe("assistant");
    expect(last.content).toBe("Request cancelled.");
    expect(last.usedFallback).not.toBe(true);
    expect(last.blocks).toBeUndefined();
  });

  it("falls back to a simulated reply on 503 gemini_not_configured (failure)", async () => {
    const err = Object.assign(new Error("seller-assistant 503"), {
      status: 503,
      code: "gemini_not_configured",
    }) as AssistantChatHttpError;
    vi.mocked(postSellerAssistantChat).mockRejectedValueOnce(err);

    const { result } = renderHook(() => useSellerAssistantChat());

    act(() => {
      result.current.sendComposerMessage("draft a deal", "configure_deal");
    });

    await waitFor(() => expect(result.current.sending).toBe(false));

    const last = result.current.messages.at(-1)!;
    expect(last.role).toBe("assistant");
    expect(last.usedFallback).toBe(true);
    expect(last.content).toBe(getSimulatedSellerReply("configure_deal", "draft a deal"));
  });
});
