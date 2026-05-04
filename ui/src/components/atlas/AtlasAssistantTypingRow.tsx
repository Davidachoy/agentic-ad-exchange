import type { JSX } from "react";

export interface AtlasAssistantTypingRowProps {
  /** Shown next to the typing dots (defaults to Atlas). */
  assistantName?: string;
}

/** Typing indicator styled like an Atlas assistant bubble (CSS-only dots). */
export function AtlasAssistantTypingRow({ assistantName = "Atlas" }: AtlasAssistantTypingRowProps): JSX.Element {
  return (
    <div className="flex gap-3.5" aria-live="polite">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.18_0.01_80)] font-atlas-mono text-[10px] font-semibold tracking-wide text-white">
        ATL
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-baseline gap-2">
          <span className="text-[13px] font-semibold text-[oklch(0.18_0.01_80)]">{assistantName}</span>
          <span className="font-atlas-mono text-[10.5px] text-[oklch(0.62_0.006_80)]">typing…</span>
        </div>
        <div
          className="inline-flex items-center gap-1 rounded-xl border border-[oklch(0.91_0.005_80)] bg-white px-3 py-2 shadow-sm"
          aria-label={`${assistantName} is typing`}
        >
          <span className="atlas-typing-dot inline-block h-1.5 w-1.5 rounded-full bg-[oklch(0.55_0.01_80)]" />
          <span className="atlas-typing-dot inline-block h-1.5 w-1.5 rounded-full bg-[oklch(0.55_0.01_80)]" />
          <span className="atlas-typing-dot inline-block h-1.5 w-1.5 rounded-full bg-[oklch(0.55_0.01_80)]" />
        </div>
      </div>
    </div>
  );
}
