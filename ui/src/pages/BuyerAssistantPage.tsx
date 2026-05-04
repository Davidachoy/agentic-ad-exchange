import type { JSX } from "react";

import { AtlasChatThread } from "../components/atlas/AtlasChatThread.js";
import { AtlasComposer } from "../components/atlas/AtlasComposer.js";
import { AtlasRightPanel } from "../components/atlas/AtlasRightPanel.js";
import { AtlasTopBar } from "../components/atlas/AtlasTopBar.js";
import { useDashboardData } from "../context/DashboardDataContext.js";
import { useBuyerAssistantChat } from "../hooks/useBuyerAssistantChat.js";

export function BuyerAssistantPage(): JSX.Element {
  const data = useDashboardData();
  const {
    messages,
    sending,
    composerTyping,
    sendWithHistory,
    sendComposerMessage,
    cancelPendingGeneration,
    chipSuggestions,
  } = useBuyerAssistantChat();

  return (
    <>
      <AtlasTopBar primary="Atlas" secondary="Exchange assistant" />
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
        <div className="flex min-h-0 flex-col border-r border-[oklch(0.91_0.005_80)] bg-[oklch(0.985_0.004_80)]">
          <AtlasChatThread
            messages={messages}
            assistantPending={sending}
            composerTyping={composerTyping}
            assistantAgentLabel="BUYER AGENT"
            assistantTypingName="Atlas"
          />
          <div className="shrink-0 border-t border-[oklch(0.91_0.005_80)] px-6 pb-2">
            <div className="mx-auto flex max-w-2xl flex-wrap gap-2 pt-2">
              {chipSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={sending || composerTyping}
                  onClick={() => void sendWithHistory(s)}
                  className="rounded-full border border-[oklch(0.91_0.005_80)] bg-white px-3 py-1.5 text-left text-[11.5px] text-[oklch(0.36_0.01_80)] hover:border-[oklch(0.72_0.006_80)] disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <AtlasComposer
            disabled={sending || composerTyping}
            pending={sending || composerTyping}
            onCancel={cancelPendingGeneration}
            onSend={(t, mode) => sendComposerMessage(t, mode)}
          />
        </div>
        <AtlasRightPanel
          connected={data.connected}
          paused={data.control.paused}
          settlementCount={data.settlementCount}
          bidCount={data.bids.length}
          listingCount={data.listings.length}
          lastAuction={data.lastAuction}
          lastReceipt={data.lastReceipt}
          control={data.control}
        />
      </div>
    </>
  );
}
