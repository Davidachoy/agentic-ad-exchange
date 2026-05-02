import type { JSX } from "react";

/** Typing indicator styled like an Atlas assistant bubble (CSS-only dots). */
export function AtlasAssistantTypingRow(): JSX.Element {
  return (
    <article
      className="flex gap-3.5"
      role="status"
      aria-live="polite"
      aria-label="Atlas is typing"
    >
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.18_0.01_80)] font-atlas-mono text-[10px] font-semibold tracking-wide text-white">
        ATL
      </div>
      <div className="min-w-0 flex-1">
        <header className="mb-1 flex flex-wrap items-baseline gap-2">
          <span className="text-[13px] font-semibold text-[oklch(0.18_0.01_80)]">Atlas</span>
          <span className="rounded-full border border-[oklch(0.91_0.005_80)] bg-[oklch(0.97_0.005_80)] px-1.5 py-0.5 font-atlas-mono text-[10px] text-[oklch(0.45_0.01_80)]">
            BUYER AGENT
          </span>
        </header>
        <div className="rounded-xl border border-[oklch(0.91_0.005_80)] bg-white px-3.5 py-3 text-left shadow-sm">
          <span className="inline-flex items-center gap-1.5" aria-hidden>
            <span className="atlas-typing-dot h-1.5 w-1.5 rounded-full bg-[oklch(0.35_0.01_80)]" />
            <span className="atlas-typing-dot h-1.5 w-1.5 rounded-full bg-[oklch(0.35_0.01_80)]" />
            <span className="atlas-typing-dot h-1.5 w-1.5 rounded-full bg-[oklch(0.35_0.01_80)]" />
          </span>
        </div>
      </div>
    </article>
  );
}
