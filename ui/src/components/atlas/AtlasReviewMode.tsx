import type { JSX } from "react";

import type { ResolvedDecision, ReviewDecision } from "./atlasRightPanelTypes.js";
import { ReviewDecisionCard } from "./ReviewDecisionCard.js";

export interface AtlasReviewModeProps {
  pending: ReviewDecision[];
  resolved: ResolvedDecision[];
  expandedId: string | null;
  onExpandedId: (id: string | null) => void;
  dontAskAgain: Record<string, boolean>;
  onDontAskAgain: (id: string, v: boolean) => void;
  exitingIds: Set<string>;
  onResolve: (id: string, approved: boolean) => void;
  autoExecutedToday: number;
}

export function AtlasReviewMode({
  pending,
  resolved,
  expandedId,
  onExpandedId,
  dontAskAgain,
  onDontAskAgain,
  exitingIds,
  onResolve,
  autoExecutedToday,
}: AtlasReviewModeProps): JSX.Element {
  if (pending.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-[oklch(0.91_0.005_80)] bg-[oklch(0.995_0.003_80)] px-6 py-14 text-center">
        <span className="text-2xl text-emerald-600" aria-hidden>
          ✓
        </span>
        <p className="mt-3 text-sm font-semibold text-[oklch(0.22_0.01_80)]">You&apos;re all caught up</p>
        <p className="mt-2 max-w-xs text-[12.5px] text-[oklch(0.5_0.01_80)]">
          Atlas will notify you when a decision needs your input
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="text-[13px] font-semibold text-[oklch(0.18_0.01_80)]">Needs your input</h3>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-atlas-mono text-[10px] font-semibold uppercase tracking-wide text-amber-900">
            {pending.length} pending
          </span>
        </div>
        <p className="mt-1 text-[12.5px] text-[oklch(0.5_0.01_80)]">
          {autoExecutedToday} decisions were auto-executed today
        </p>
      </div>

      <div className="space-y-2">
        {pending.map((d) => (
          <ReviewDecisionCard
            key={d.id}
            decision={d}
            expanded={expandedId === d.id}
            onToggleExpand={() => onExpandedId(expandedId === d.id ? null : d.id)}
            dontAskAgain={Boolean(dontAskAgain[d.id])}
            onDontAskAgain={(v) => onDontAskAgain(d.id, v)}
            exiting={exitingIds.has(d.id)}
            onPrimary={() => onResolve(d.id, true)}
            onSecondary={() => onResolve(d.id, false)}
            onDanger={() => onResolve(d.id, false)}
          />
        ))}
      </div>

      <details className="rounded-[10px] border border-[oklch(0.91_0.005_80)] bg-white shadow-sm">
        <summary className="cursor-pointer px-4 py-3 font-atlas-mono text-[10px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
          Recent · last 24h
        </summary>
        <ul className="list-none space-y-2 border-t border-[oklch(0.94_0.004_80)] p-3">
          {resolved.map((r) => (
            <li key={r.id} className="flex items-center gap-2 font-atlas-mono text-[11.5px] text-[oklch(0.32_0.01_80)]">
              <span className={r.approved ? "text-emerald-600" : "text-red-600"}>{r.approved ? "✓" : "✗"}</span>
              <span className="min-w-0 flex-1 truncate">{r.title}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
