import type { JSX } from "react";

import type { ReviewDecision } from "./atlasRightPanelTypes.js";

export interface ReviewDecisionCardProps {
  decision: ReviewDecision;
  expanded: boolean;
  onToggleExpand: () => void;
  dontAskAgain: boolean;
  onDontAskAgain: (v: boolean) => void;
  exiting: boolean;
  onPrimary: () => void;
  onSecondary: () => void;
  onDanger: () => void;
}

export function ReviewDecisionCard({
  decision,
  expanded,
  onToggleExpand,
  dontAskAgain,
  onDontAskAgain,
  exiting,
  onPrimary,
  onSecondary,
  onDanger,
}: ReviewDecisionCardProps): JSX.Element {
  return (
    <article
      className={`overflow-hidden rounded-[10px] border border-[oklch(0.91_0.005_80)] bg-white shadow-sm transition-all duration-300 ease-out ${
        exiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
      }`}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggleExpand}
        className="flex w-full items-start gap-2 px-4 py-3 text-left hover:bg-[oklch(0.995_0.003_80)]"
      >
        <span className="shrink-0 rounded border border-[oklch(0.91_0.005_80)] bg-[oklch(0.98_0.004_80)] px-1.5 py-0.5 font-atlas-mono text-[9px] font-semibold uppercase tracking-wide text-[oklch(0.4_0.01_80)]">
          {decision.tag}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-[oklch(0.18_0.01_80)]">{decision.title}</span>
          <span className="mt-0.5 block text-[12.5px] text-[oklch(0.42_0.01_80)]">{decision.summary}</span>
        </span>
        <span className="shrink-0 font-atlas-mono text-[10.5px] text-[oklch(0.55_0.006_80)]">{decision.age}</span>
      </button>
      {expanded ? (
        <div className="border-t border-[oklch(0.94_0.004_80)] px-4 py-3">
          <p className="text-[12.5px] leading-relaxed text-[oklch(0.32_0.01_80)]">{decision.context}</p>
          <div className="mt-3">
            <div className="font-atlas-mono text-[9.5px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
              Atlas reasoning
            </div>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[12.5px] text-[oklch(0.28_0.01_80)]">
              {decision.reasoning.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-[12.5px] font-medium text-[oklch(0.28_0.01_80)]">
            <span className="font-atlas-mono text-[9.5px] uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
              Impact{" "}
            </span>
            {decision.impact}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={onPrimary}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-emerald-700"
            >
              {decision.primaryLabel}
            </button>
            <button
              type="button"
              onClick={onSecondary}
              className="rounded-lg border border-[oklch(0.91_0.005_80)] bg-white px-4 py-2 text-[12.5px] font-medium"
            >
              {decision.secondaryLabel}
            </button>
            <button
              type="button"
              onClick={onDanger}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-[12.5px] font-semibold text-red-900 hover:bg-red-100"
            >
              {decision.dangerLabel}
            </button>
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-[12px] text-[oklch(0.4_0.01_80)]">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={(e) => onDontAskAgain(e.target.checked)}
              className="rounded border-[oklch(0.91_0.005_80)]"
            />
            Don&apos;t ask again for this condition
          </label>
        </div>
      ) : null}
    </article>
  );
}
