import type { JSX } from "react";
import { useCallback } from "react";

import { AtlasChatThread } from "../components/atlas/AtlasChatThread.js";
import { AtlasTopBar } from "../components/atlas/AtlasTopBar.js";
import { SellerYieldComposer } from "../components/atlas/SellerYieldComposer.js";
import { SellerYieldRightPanel } from "../components/atlas/SellerYieldRightPanel.js";
import { useSellerAssistantChat } from "../hooks/useSellerAssistantChat.js";

export function SellerAssistantPage(): JSX.Element {
  const {
    messages,
    composerTyping,
    sendChip,
    sendComposerMessage,
    appendUserMessage,
    cancelPendingGeneration,
    chipSuggestions,
  } = useSellerAssistantChat();

  const onNewDealInChat = useCallback(() => {
    appendUserMessage("+ New deal — walk me through a **PMP draft** in Configure deal mode.");
  }, [appendUserMessage]);

  return (
    <>
      <AtlasTopBar primary="Yield" secondary="Supply assistant" />
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
        <div className="flex min-h-0 flex-col border-r border-[oklch(0.91_0.005_80)] bg-[oklch(0.985_0.004_80)]">
          <AtlasChatThread
            messages={messages}
            assistantPending={false}
            composerTyping={composerTyping}
            assistantAgentLabel="SELLER AGENT"
            assistantTypingName="Atlas"
          />
          <div className="shrink-0 border-t border-[oklch(0.91_0.005_80)] px-6 pb-2">
            <div className="mx-auto flex max-w-2xl flex-wrap gap-2 pt-2">
              {chipSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={composerTyping}
                  onClick={() => sendChip(s)}
                  className="rounded-full border border-[oklch(0.91_0.005_80)] bg-white px-3 py-1.5 text-left text-[11.5px] text-[oklch(0.36_0.01_80)] hover:border-[oklch(0.72_0.006_80)] disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <SellerYieldComposer
            disabled={composerTyping}
            pending={composerTyping}
            onCancel={cancelPendingGeneration}
            onSend={sendComposerMessage}
          />
        </div>
        <SellerYieldRightPanel onNewDealInChat={onNewDealInChat} />
      </div>
    </>
  );
}
