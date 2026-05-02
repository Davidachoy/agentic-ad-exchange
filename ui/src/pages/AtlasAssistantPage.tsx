import type { AssistantChatMessage } from "@ade/shared";
import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { postAssistantChat, type AssistantChatHttpError } from "../api/client.js";
import {
  buildDashboardAssistantContext,
  buildFallbackAssistantSummary,
} from "../assistant/buildDashboardContext.js";
import { AtlasChatThread } from "../components/atlas/AtlasChatThread.js";
import { AtlasComposer } from "../components/atlas/AtlasComposer.js";
import { AtlasLiveCanvas } from "../components/atlas/AtlasLiveCanvas.js";
import type { ChatLine } from "../components/atlas/AtlasMessageBubble.js";
import { AtlasSidebar } from "../components/atlas/AtlasSidebar.js";
import { AtlasTopBar } from "../components/atlas/AtlasTopBar.js";
import { useDashboardData } from "../context/DashboardDataContext.js";

const SUGGESTIONS = [
  "Summarize key metrics from the dashboard.",
  "Explain the last auction decision.",
  "What should I do next on the Exchange page?",
] as const;

function newId(): string {
  return crypto.randomUUID();
}

export function AtlasAssistantPage(): JSX.Element {
  const data = useDashboardData();
  const [messages, setMessages] = useState<ChatLine[]>(() => [
    {
      id: newId(),
      role: "assistant",
      content:
        "I'm **Atlas**, your in-app assistant for the Agentic Ad Exchange. Ask about listings, bids, the latest auction, settlements, or demo pause state — I'll use the live snapshot from this session.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [sending, setSending] = useState(false);
  const messagesRef = useRef(messages);
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

  const sendWithHistory = useCallback(
    async (userText: string) => {
      const userMsg: ChatLine = {
        id: newId(),
        role: "user",
        content: userText,
        createdAt: new Date().toISOString(),
      };
      const combined = [...messagesRef.current, userMsg];
      messagesRef.current = combined;
      setMessages(combined);
      setSending(true);

      const historyForApi: AssistantChatMessage[] = combined.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let replyText: string;
      let usedFallback = false;
      try {
        const res = await postAssistantChat({ messages: historyForApi, context: contextPayload });
        replyText = res.reply;
      } catch (e) {
        const err = e as AssistantChatHttpError;
        if (err.status === 503 && err.code === "gemini_not_configured") {
          replyText = buildFallbackAssistantSummary(contextPayload);
          usedFallback = true;
        } else {
          replyText = `I could not reach the assistant service (${err.status}). Here's a quick offline summary:\n\n${buildFallbackAssistantSummary(contextPayload)}`;
          usedFallback = true;
        }
      }

      const withAssistant: ChatLine[] = [
        ...messagesRef.current,
        {
          id: newId(),
          role: "assistant" as const,
          content: replyText,
          createdAt: new Date().toISOString(),
          usedFallback,
        },
      ];
      messagesRef.current = withAssistant;
      setMessages(withAssistant);
      setSending(false);
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
            <AtlasChatThread messages={messages} />
            <div className="shrink-0 border-t border-[oklch(0.91_0.005_80)] px-6 pb-2">
              <div className="mx-auto flex max-w-2xl flex-wrap gap-2 pt-2">
                {SUGGESTIONS.map((s) => (
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
            <AtlasComposer disabled={sending} onSend={(t) => void sendWithHistory(t)} />
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
