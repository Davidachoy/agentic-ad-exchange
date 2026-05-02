import type { JSX } from "react";
import { useEffect, useRef } from "react";

import { AtlasMessageBubble, type ChatLine } from "./AtlasMessageBubble.js";

export interface AtlasChatThreadProps {
  messages: ChatLine[];
  /** When true, shows an inline status row so the thread is not empty while the assistant request is in flight. */
  assistantPending?: boolean;
}

export function AtlasChatThread({ messages, assistantPending = false }: AtlasChatThreadProps): JSX.Element {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = endRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, assistantPending]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-7 font-atlas">
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <div className="mb-2 flex items-center gap-2.5">
          <div className="h-px flex-1 bg-[oklch(0.94_0.004_80)]" />
          <span className="font-atlas-mono text-[10px] font-semibold uppercase tracking-widest text-[oklch(0.62_0.006_80)]">
            Today
          </span>
          <div className="h-px flex-1 bg-[oklch(0.94_0.004_80)]" />
        </div>
        {messages.map((m) => (
          <AtlasMessageBubble key={m.id} message={m} />
        ))}
        {assistantPending ? (
          <div
            role="status"
            aria-live="polite"
            aria-label="Atlas is drafting a reply"
            className="rounded-xl border border-dashed border-[oklch(0.88_0.006_80)] bg-[oklch(0.99_0.003_80)] px-3.5 py-2.5 text-[13px] text-[oklch(0.45_0.01_80)]"
          >
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[oklch(0.55_0.12_230)]" />
              Atlas is drafting a reply…
            </span>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>
    </div>
  );
}
