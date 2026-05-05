import type { AssistantChatMessage, DashboardAssistantContext } from "@ade/shared";
import { DashboardAssistantContextSchema } from "@ade/shared";
import { useCallback, useEffect, useRef, useState } from "react";

import { postSellerAssistantChat } from "../api/client.js";
import {
  getSellerChipDemoReply,
  SELLER_CHIP_SUGGESTIONS,
} from "../assistant/sellerChipDemoCatalog.js";
import {
  getSimulatedSellerReply,
  type SellerComposerMode,
} from "../assistant/sellerComposerSimulation.js";
import type { ChatLine } from "../components/atlas/AtlasMessageBubble.js";

function newId(): string {
  return crypto.randomUUID();
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  return false;
}

function sellerModeFromId(modeId: string): SellerComposerMode {
  if (
    modeId === "ask" ||
    modeId === "set_floor" ||
    modeId === "run_auction" ||
    modeId === "configure_deal" ||
    modeId === "block_buyer" ||
    modeId === "analyze"
  ) {
    return modeId;
  }
  return "ask";
}

// Reason: SYSTEM_SELLER assumes no live exchange snapshot; empty defaults are valid here.
function emptyDashboardContext(): DashboardAssistantContext {
  return DashboardAssistantContextSchema.parse({
    generatedAt: new Date().toISOString(),
    sseConnected: false,
    demoPaused: false,
    settlementCount: 0,
    listings: [],
    bids: [],
    recentAuctions: [],
    lastAuction: null,
    lastReceipt: null,
  });
}

export interface UseSellerAssistantChatResult {
  messages: ChatLine[];
  sending: boolean;
  composerTyping: boolean;
  sendChip: (text: string) => void;
  sendComposerMessage: (text: string, modeId: string) => void;
  /** Symmetric to useBuyerAssistantChat.sendWithHistory: defers to ask-mode composer send. */
  sendWithHistory: (text: string) => Promise<void>;
  appendUserMessage: (text: string) => void;
  /** Aborts an in-flight assistant fetch or clears the chip-simulation timer. */
  cancelPendingGeneration: () => void;
  chipSuggestions: readonly string[];
}

export function useSellerAssistantChat(): UseSellerAssistantChatResult {
  const [messages, setMessages] = useState<ChatLine[]>(() => [
    {
      id: newId(),
      role: "assistant",
      content:
        "I'm **Atlas (Yield)**, your in-app assistant for this publisher shell. The composer **calls the live assistant** (server + Gemini when configured) and **falls back** to a local summary on error. **Chips** below return **local** demo replies—start in **Ask** for open questions, or pick a mode for floors, deals, blocks, and analysis.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [sending, setSending] = useState(false);
  const [composerTyping, setComposerTyping] = useState(false);
  const messagesRef = useRef(messages);
  const assistantAbortRef = useRef<AbortController | null>(null);
  const composerSimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageMountedRef = useRef(true);
  const composerSimBusyRef = useRef(false);
  const assistantBusyRef = useRef(false);
  const userCancelRequestedRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return () => {
      pageMountedRef.current = false;
      if (composerSimTimerRef.current != null) {
        clearTimeout(composerSimTimerRef.current);
        composerSimTimerRef.current = null;
      }
      composerSimBusyRef.current = false;
      setComposerTyping(false);
    };
  }, []);

  const pushAssistant = useCallback((content: string, extra?: Partial<ChatLine>) => {
    const line: ChatLine = {
      id: newId(),
      role: "assistant",
      content,
      createdAt: new Date().toISOString(),
      ...extra,
    };
    const next = [...messagesRef.current, line];
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const appendUser = useCallback((line: ChatLine): ChatLine[] => {
    const next = [...messagesRef.current, line];
    messagesRef.current = next;
    setMessages(next);
    return next;
  }, []);

  const cancelAssistantRequest = useCallback(() => {
    userCancelRequestedRef.current = true;
    assistantAbortRef.current?.abort();
  }, []);

  const cancelPendingGeneration = useCallback(() => {
    if (assistantBusyRef.current) {
      cancelAssistantRequest();
      return;
    }
    if (composerSimTimerRef.current != null) {
      clearTimeout(composerSimTimerRef.current);
      composerSimTimerRef.current = null;
    }
    composerSimBusyRef.current = false;
    setComposerTyping(false);
  }, [cancelAssistantRequest]);

  const sendChip = useCallback(
    (userText: string) => {
      if (composerSimBusyRef.current || assistantBusyRef.current) return;
      composerSimBusyRef.current = true;
      appendUser({
        id: newId(),
        role: "user",
        content: userText,
        createdAt: new Date().toISOString(),
      });

      const reply =
        getSellerChipDemoReply(userText) ??
        "Captured. In production this would call your yield agent with **live** pacing, floors, and deal terms.";

      setComposerTyping(true);
      composerSimTimerRef.current = setTimeout(() => {
        composerSimTimerRef.current = null;
        if (pageMountedRef.current) {
          pushAssistant(reply, { demoPreview: true });
          setComposerTyping(false);
        }
        composerSimBusyRef.current = false;
      }, 600);
    },
    [appendUser, pushAssistant],
  );

  const sendComposerMessage = useCallback(
    (userText: string, modeId: string) => {
      if (assistantBusyRef.current || composerSimBusyRef.current) return;
      const mode = sellerModeFromId(modeId);
      assistantBusyRef.current = true;

      const combined = appendUser({
        id: newId(),
        role: "user",
        content: userText,
        createdAt: new Date().toISOString(),
        userSellerMode: mode === "analyze" || mode === "ask" ? undefined : mode,
      });

      const ac = new AbortController();
      assistantAbortRef.current = ac;
      setSending(true);

      const history: AssistantChatMessage[] = combined.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      void (async () => {
        try {
          const res = await postSellerAssistantChat(
            { messages: history, context: emptyDashboardContext(), role: "seller", mode },
            { signal: ac.signal },
          );
          if (pageMountedRef.current) {
            pushAssistant(res.reply.trim() || "Atlas returned an empty reply.", {
              blocks: res.blocks,
            });
          }
        } catch (e) {
          if (isAbortError(e) && userCancelRequestedRef.current) {
            userCancelRequestedRef.current = false;
            if (pageMountedRef.current) pushAssistant("Request cancelled.");
          } else if (pageMountedRef.current) {
            pushAssistant(getSimulatedSellerReply(mode, userText), { usedFallback: true });
          }
        } finally {
          if (assistantAbortRef.current === ac) assistantAbortRef.current = null;
          assistantBusyRef.current = false;
          if (pageMountedRef.current) setSending(false);
        }
      })();
    },
    [appendUser, pushAssistant],
  );

  const sendWithHistory = useCallback(
    async (text: string): Promise<void> => {
      sendComposerMessage(text, "ask");
    },
    [sendComposerMessage],
  );

  const appendUserMessage = useCallback(
    (text: string) => {
      if (composerSimBusyRef.current || assistantBusyRef.current) return;
      appendUser({
        id: newId(),
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      });
    },
    [appendUser],
  );

  return {
    messages,
    sending,
    composerTyping,
    sendChip,
    sendComposerMessage,
    sendWithHistory,
    appendUserMessage,
    cancelPendingGeneration,
    chipSuggestions: SELLER_CHIP_SUGGESTIONS,
  };
}
