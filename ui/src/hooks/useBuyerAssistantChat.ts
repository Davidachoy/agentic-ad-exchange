import type { AssistantChatMessage } from "@ade/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ASSISTANT_FETCH_DEADLINE_MS,
  postAssistantChat,
  type AssistantChatHttpError,
} from "../api/client.js";
import { ATLAS_CHIP_SUGGESTIONS, getAtlasChipDemoReply } from "../assistant/atlasChipDemoCatalog.js";
import { getSimulatedAtlasReply, type AtlasComposerMode } from "../assistant/atlasComposerSimulation.js";
import {
  buildDashboardAssistantContext,
  buildFallbackAssistantBlocks,
  buildFallbackAssistantSummary,
} from "../assistant/buildDashboardContext.js";
import type { ChatLine } from "../components/atlas/AtlasMessageBubble.js";
import { useDashboardData } from "../context/DashboardDataContext.js";

function newId(): string {
  return crypto.randomUUID();
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return true;
  }
  return false;
}

export interface UseBuyerAssistantChatResult {
  messages: ChatLine[];
  sending: boolean;
  composerTyping: boolean;
  sendWithHistory: (userText: string) => Promise<void>;
  sendComposerMessage: (userText: string, mode: AtlasComposerMode) => void;
  /** Aborts live assistant fetch or cancels the local composer simulation timer. */
  cancelPendingGeneration: () => void;
  chipSuggestions: readonly string[];
}

export function useBuyerAssistantChat(): UseBuyerAssistantChatResult {
  const data = useDashboardData();
  const [messages, setMessages] = useState<ChatLine[]>(() => [
    {
      id: newId(),
      role: "assistant",
      content:
        "I'm **Atlas**, your in-app assistant for the Agentic Ad Exchange. **Suggestion chips** insert **local demo replies** when they match a preset, or call the **live assistant** (server + Gemini when configured). Messages you **type below** use a **local simulation** (typing indicator + canned replies) for this demo.",
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

  const contextPayload = useMemo(
    () =>
      buildDashboardAssistantContext({
        sseConnected: data.connected,
        demoPaused: data.control.paused,
        settlementCount: data.settlementCount,
        listings: data.listings,
        bids: data.bids,
        recentAuctions: data.auctions,
        lastAuction: data.lastAuction,
        lastReceipt: data.lastReceipt,
      }),
    [
      data.connected,
      data.control.paused,
      data.settlementCount,
      data.listings,
      data.bids,
      data.auctions,
      data.lastAuction,
      data.lastReceipt,
    ],
  );

  const cancelAssistantRequest = useCallback(() => {
    userCancelRequestedRef.current = true;
    assistantAbortRef.current?.abort();
  }, []);

  const cancelPendingGeneration = useCallback(() => {
    if (sending) {
      cancelAssistantRequest();
      return;
    }
    if (composerSimTimerRef.current != null) {
      clearTimeout(composerSimTimerRef.current);
      composerSimTimerRef.current = null;
    }
    composerSimBusyRef.current = false;
    setComposerTyping(false);
  }, [sending, cancelAssistantRequest]);

  const sendWithHistory = useCallback(
    async (userText: string) => {
      if (assistantBusyRef.current || composerSimBusyRef.current) {
        return;
      }
      assistantBusyRef.current = true;

      const userMsg: ChatLine = {
        id: newId(),
        role: "user",
        content: userText,
        createdAt: new Date().toISOString(),
      };
      const combined = [...messagesRef.current, userMsg];
      messagesRef.current = combined;
      setMessages(combined);

      const chipDemo = getAtlasChipDemoReply(userText);
      if (chipDemo !== null) {
        const withDemo: ChatLine[] = [
          ...messagesRef.current,
          {
            id: newId(),
            role: "assistant" as const,
            content: chipDemo.reply,
            createdAt: new Date().toISOString(),
            demoPreview: true,
            blocks: chipDemo.blocks,
          },
        ];
        messagesRef.current = withDemo;
        setMessages(withDemo);
        assistantBusyRef.current = false;
        return;
      }

      const ac = new AbortController();
      assistantAbortRef.current = ac;
      setSending(true);

      const historyForApi: AssistantChatMessage[] = combined.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        let replyText: string;
        let usedFallback = false;
        let assistantBlocks: ChatLine["blocks"];
        try {
          const res = await postAssistantChat(
            { messages: historyForApi, context: contextPayload },
            { signal: ac.signal },
          );
          replyText = res.reply;
          assistantBlocks = res.blocks;
        } catch (e) {
          if (isAbortError(e)) {
            if (userCancelRequestedRef.current) {
              userCancelRequestedRef.current = false;
              const afterCancel: ChatLine[] = [
                ...messagesRef.current,
                {
                  id: newId(),
                  role: "assistant",
                  content: "Request cancelled.",
                  createdAt: new Date().toISOString(),
                },
              ];
              messagesRef.current = afterCancel;
              setMessages(afterCancel);
              return;
            }
            const waitSec = Math.round(ASSISTANT_FETCH_DEADLINE_MS / 1000);
            replyText = `The assistant took longer than ~${waitSec}s (client limit) or the connection dropped. Here's an offline snapshot you can still use:\n\n${buildFallbackAssistantSummary(contextPayload)}`;
            assistantBlocks = buildFallbackAssistantBlocks(contextPayload);
            usedFallback = true;
          } else {
            const err = e as AssistantChatHttpError;
            assistantBlocks = buildFallbackAssistantBlocks(contextPayload);
            if (err.status === 503 && err.code === "gemini_not_configured") {
              replyText = buildFallbackAssistantSummary(contextPayload);
              usedFallback = true;
            } else {
              replyText = `I could not reach the assistant service (${err.status}). Here's a quick offline summary:\n\n${buildFallbackAssistantSummary(contextPayload)}`;
              usedFallback = true;
            }
          }
        }

        const trimmedReply = replyText.trim();
        const safeReply =
          trimmedReply.length > 0
            ? trimmedReply
            : "Atlas returned an empty reply. Try again, or check that **GEMINI_API_KEY** is set on the server and watch the server logs for errors.";

        const withAssistant: ChatLine[] = [
          ...messagesRef.current,
          {
            id: newId(),
            role: "assistant" as const,
            content: safeReply,
            createdAt: new Date().toISOString(),
            usedFallback,
            blocks: assistantBlocks,
          },
        ];
        messagesRef.current = withAssistant;
        setMessages(withAssistant);
      } finally {
        if (assistantAbortRef.current === ac) {
          assistantAbortRef.current = null;
        }
        assistantBusyRef.current = false;
        setSending(false);
      }
    },
    [contextPayload],
  );

  const sendComposerMessage = useCallback((userText: string, mode: AtlasComposerMode) => {
    if (sending || composerSimBusyRef.current || assistantBusyRef.current) {
      return;
    }
    composerSimBusyRef.current = true;
    const userMsg: ChatLine = {
      id: newId(),
      role: "user",
      content: userText,
      createdAt: new Date().toISOString(),
      userComposerMode: mode === "direct" ? undefined : mode,
    };
    const withUser = [...messagesRef.current, userMsg];
    messagesRef.current = withUser;
    setMessages(withUser);
    setComposerTyping(true);

    composerSimTimerRef.current = setTimeout(() => {
      composerSimTimerRef.current = null;
      const reply = getSimulatedAtlasReply(mode, userText);
      const withAssistant: ChatLine[] = [
        ...messagesRef.current,
        {
          id: newId(),
          role: "assistant" as const,
          content: reply,
          createdAt: new Date().toISOString(),
        },
      ];
      if (pageMountedRef.current) {
        messagesRef.current = withAssistant;
        setMessages(withAssistant);
        setComposerTyping(false);
      }
      composerSimBusyRef.current = false;
    }, 1200);
  }, [sending]);

  return {
    messages,
    sending,
    composerTyping,
    sendWithHistory,
    sendComposerMessage,
    cancelPendingGeneration,
    chipSuggestions: ATLAS_CHIP_SUGGESTIONS,
  };
}
