import { useCallback, useEffect, useRef, useState } from "react";

import { getSellerChipDemoReply, SELLER_CHIP_SUGGESTIONS } from "../assistant/sellerChipDemoCatalog.js";
import { getSimulatedSellerReply, type SellerComposerMode } from "../assistant/sellerComposerSimulation.js";
import type { ChatLine } from "../components/atlas/AtlasMessageBubble.js";

function newId(): string {
  return crypto.randomUUID();
}

function sellerModeFromId(modeId: string): SellerComposerMode {
  if (
    modeId === "ask" ||
    modeId === "set_floor" ||
    modeId === "configure_deal" ||
    modeId === "block_buyer" ||
    modeId === "analyze"
  ) {
    return modeId;
  }
  return "ask";
}

export interface UseSellerAssistantChatResult {
  messages: ChatLine[];
  composerTyping: boolean;
  sendChip: (text: string) => void;
  sendComposerMessage: (text: string, modeId: string) => void;
  appendUserMessage: (text: string) => void;
  /** Clears the in-flight chip or composer simulation timer. */
  cancelPendingGeneration: () => void;
  chipSuggestions: readonly string[];
}

export function useSellerAssistantChat(): UseSellerAssistantChatResult {
  const [messages, setMessages] = useState<ChatLine[]>(() => [
    {
      id: newId(),
      role: "assistant",
      content:
        "I'm **Atlas** for this demo publisher shell. **Chips** below return **local** answers; the composer simulates **1200ms** replies—start in **Ask** for open questions, or pick a mode for structured floors, deals, blocks, and analysis.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [composerTyping, setComposerTyping] = useState(false);
  const messagesRef = useRef(messages);
  const composerSimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageMountedRef = useRef(true);
  const composerSimBusyRef = useRef(false);

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

  const sendChip = useCallback(
    (userText: string) => {
      if (composerSimBusyRef.current) {
        return;
      }
      composerSimBusyRef.current = true;
      const userMsg: ChatLine = {
        id: newId(),
        role: "user",
        content: userText,
        createdAt: new Date().toISOString(),
      };
      const withUser = [...messagesRef.current, userMsg];
      messagesRef.current = withUser;
      setMessages(withUser);

      const chip = getSellerChipDemoReply(userText);
      const reply =
        chip ??
        "Captured. In production this would call your yield agent with **live** pacing, floors, and deal terms.";

      setComposerTyping(true);
      composerSimTimerRef.current = setTimeout(() => {
        composerSimTimerRef.current = null;
        if (pageMountedRef.current) {
          pushAssistant(reply);
          setComposerTyping(false);
        }
        composerSimBusyRef.current = false;
      }, 600);
    },
    [pushAssistant],
  );

  const sendComposerMessage = useCallback(
    (userText: string, modeId: string) => {
      if (composerSimBusyRef.current) {
        return;
      }
      composerSimBusyRef.current = true;
      const mode = sellerModeFromId(modeId);
      const userMsg: ChatLine = {
        id: newId(),
        role: "user",
        content: userText,
        createdAt: new Date().toISOString(),
        userSellerMode: mode === "analyze" || mode === "ask" ? undefined : mode,
      };
      const withUser = [...messagesRef.current, userMsg];
      messagesRef.current = withUser;
      setMessages(withUser);
      setComposerTyping(true);

      composerSimTimerRef.current = setTimeout(() => {
        composerSimTimerRef.current = null;
        const reply = getSimulatedSellerReply(mode, userText);
        if (pageMountedRef.current) {
          pushAssistant(reply);
          setComposerTyping(false);
        }
        composerSimBusyRef.current = false;
      }, 1200);
    },
    [pushAssistant],
  );

  const appendUserMessage = useCallback((text: string) => {
    if (composerSimBusyRef.current) {
      return;
    }
    const userMsg: ChatLine = {
      id: newId(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    const next = [...messagesRef.current, userMsg];
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const cancelPendingGeneration = useCallback(() => {
    if (composerSimTimerRef.current != null) {
      clearTimeout(composerSimTimerRef.current);
      composerSimTimerRef.current = null;
    }
    composerSimBusyRef.current = false;
    setComposerTyping(false);
  }, []);

  return {
    messages,
    composerTyping,
    sendChip,
    sendComposerMessage,
    appendUserMessage,
    cancelPendingGeneration,
    chipSuggestions: SELLER_CHIP_SUGGESTIONS,
  };
}
