import type { JSX } from "react";
import { useEffect, useRef } from "react";

import { AtlasMessageBubble, type ChatLine } from "./AtlasMessageBubble.js";

export function AtlasChatThread({ messages }: { messages: ChatLine[] }): JSX.Element {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = endRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

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
        <div ref={endRef} />
      </div>
    </div>
  );
}
