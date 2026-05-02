import type { AssistantChatMessage } from "@ade/shared";
import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ASSISTANT_FETCH_DEADLINE_MS,
  postAssistantChat,
  type AssistantChatHttpError,
} from "../api/client.js";
import { ATLAS_CHIP_SUGGESTIONS, getAtlasChipDemoReply } from "../assistant/atlasChipDemoCatalog.js";
import {
  buildDashboardAssistantContext,
  buildFallbackAssistantBlocks,
  buildFallbackAssistantSummary,
} from "../assistant/buildDashboardContext.js";
import { AtlasChatThread } from "../components/atlas/AtlasChatThread.js";
import { AtlasComposer } from "../components/atlas/AtlasComposer.js";
import { AtlasLiveCanvas } from "../components/atlas/AtlasLiveCanvas.js";
import type { ChatLine } from "../components/atlas/AtlasMessageBubble.js";
import { AtlasSidebar } from "../components/atlas/AtlasSidebar.js";
import { AtlasTopBar } from "../components/atlas/AtlasTopBar.js";
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

export function AtlasAssistantPage(): JSX.Element {
  const data = useDashboardData();
  const [messages, setMessages] = useState<ChatLine[]>(() => [
    {
      id: newId(),
      role: "assistant",
      content:
        "I'm **Atlas**, your in-app assistant for the Agentic Ad Exchange. **Suggestion chips** below insert **local demo replies** (sample cards and charts) with no API call — type a message in the box when you want the **live assistant** (server + Gemini when configured).",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [sending, setSending] = useState(false);
  const messagesRef = useRef(messages);
  const assistantAbortRef = useRef<AbortController | null>(null);
  /** Prevents parallel POSTs (double chip / re-entrant send) while one assistant call is in flight. */
  const assistantBusyRef = useRef(false);
  /** True only when the user clicked Cancel — other aborts (unmount) stay silent. */
  const userCancelRequestedRef = useRef(false);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

  const sendWithHistory = useCallback(
    async (userText: string) => {
      if (assistantBusyRef.current) {
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

  return (
    <div className="flex h-screen min-h-0 bg-[oklch(0.985_0.004_80)] text-[oklch(0.18_0.01_80)]">
      <AtlasSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AtlasTopBar />
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
          <div className="flex min-h-0 flex-col border-r border-[oklch(0.91_0.005_80)] bg-[oklch(0.985_0.004_80)]">
            <AtlasChatThread messages={messages} assistantPending={sending} />
            <div className="shrink-0 border-t border-[oklch(0.91_0.005_80)] px-6 pb-2">
              <div className="mx-auto flex max-w-2xl flex-wrap gap-2 pt-2">
                {ATLAS_CHIP_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={sending}
                    onClick={() => void sendWithHistory(s)}
                    className="rounded-full border border-[oklch(0.91_0.005_80)] bg-white px-3 py-1.5 text-left text-[11.5px] text-[oklch(0.36_0.01_80)] hover:border-[oklch(0.72_0.006_80)] disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <AtlasComposer
              disabled={sending}
              pending={sending}
              onCancel={cancelAssistantRequest}
              onSend={(t) => void sendWithHistory(t)}
            />
          </div>
          <AtlasLiveCanvas
            connected={data.connected}
            paused={data.control.paused}
            settlementCount={data.settlementCount}
            bidCount={data.bids.length}
            listingCount={data.listings.length}
            lastAuction={data.lastAuction}
            lastReceipt={data.lastReceipt}
          />
        </div>
      </div>
    </div>
  );
}
