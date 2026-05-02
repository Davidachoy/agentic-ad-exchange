import type { JSX } from "react";

import type { ControlStateHandle } from "../../hooks/useControlState.js";
import type { AtlasException } from "./atlasRightPanelTypes.js";
import { AtlasExchangePulseCard } from "./AtlasExchangePulseCard.js";
import type { AtlasExchangePulseCardProps } from "./AtlasExchangePulseCard.js";
import { MOCK_PACING } from "./atlasMockCampaign.js";

export interface AtlasMonitorModeProps {
  exceptions: AtlasException[];
  showAllExceptions: boolean;
  onShowAllExceptions: (v: boolean) => void;
  exchangeOpen: boolean;
  onExchangeOpen: (v: boolean) => void;
  exchange: AtlasExchangePulseCardProps;
  control: ControlStateHandle;
  settledDisplay: string;
  winRateDisplay: string;
  burnDisplay: string;
  savedDisplay: string;
  autoExecutedToday: number;
  totalDecisionsToday: number;
}

function pacingNowPct(): number {
  const d = new Date();
  const mins = d.getHours() * 60 + d.getMinutes();
  return Math.min(100, Math.round((mins / (24 * 60)) * 100));
}

export function AtlasMonitorMode({
  exceptions,
  showAllExceptions,
  onShowAllExceptions,
  exchangeOpen,
  onExchangeOpen,
  exchange,
  control,
  settledDisplay,
  winRateDisplay,
  burnDisplay,
  savedDisplay,
  autoExecutedToday,
  totalDecisionsToday,
}: AtlasMonitorModeProps): JSX.Element {
  const nowPct = pacingNowPct();
  const visible =
    exceptions.length <= 3 ? exceptions : showAllExceptions ? exceptions : exceptions.slice(0, 2);
  const overflow = exceptions.length > 3;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[10px] border border-[oklch(0.91_0.005_80)] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h3 className="text-[13px] font-semibold text-[oklch(0.18_0.01_80)]">Atlas</h3>
            <span
              className="inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)] animate-pulse"
              aria-hidden
            />
            <span className="rounded border border-[oklch(0.91_0.005_80)] bg-[oklch(0.99_0.004_80)] px-2 py-0.5 font-atlas-mono text-[10px] font-medium uppercase tracking-wide text-[oklch(0.4_0.01_80)]">
              autonomous
            </span>
          </div>
          <button
            type="button"
            disabled={control.pending}
            onClick={() => void (control.paused ? control.resume() : control.pause())}
            className="shrink-0 rounded-lg border border-[oklch(0.91_0.005_80)] bg-white px-3 py-1.5 text-[11.5px] font-medium text-[oklch(0.28_0.01_80)] hover:bg-[oklch(0.98_0.004_80)] disabled:opacity-50"
          >
            {control.paused ? "Resume" : "Pause"}
          </button>
        </div>
        <p className="mt-2 font-atlas-mono text-[11px] text-[oklch(0.45_0.01_80)]">
          14h 22m uptime · {totalDecisionsToday} decisions
        </p>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-[oklch(0.91_0.005_80)] bg-white shadow-sm">
        <div className="grid grid-cols-2 divide-x divide-y divide-[oklch(0.94_0.004_80)]">
          <MetricChip label="Settled" value={settledDisplay} tone="neutral" />
          <MetricChip label="Win rate" value={winRateDisplay} tone="good" />
          <MetricChip label="Burn/h" value={burnDisplay} tone="warn" />
          <MetricChip label="Saved" value={savedDisplay} tone="good" />
        </div>
      </div>

      {exceptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-[oklch(0.91_0.005_80)] bg-[oklch(0.995_0.003_80)] px-6 py-12 text-center">
          <p className="text-sm font-medium text-[oklch(0.28_0.01_80)]">Atlas is operating within policy</p>
          <p className="mt-2 max-w-xs text-[12.5px] leading-relaxed text-[oklch(0.5_0.01_80)]">
            {autoExecutedToday} of {totalDecisionsToday} decisions auto-executed today
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((ex) => (
            <article
              key={ex.id}
              className={`rounded-[10px] border border-[oklch(0.91_0.005_80)] bg-white p-3 pl-3 shadow-sm ${
                ex.severity === "critical"
                  ? "border-l-2 border-l-red-500"
                  : ex.severity === "success"
                    ? "border-l-2 border-l-emerald-500"
                    : "border-l-2 border-l-amber-500"
              }`}
            >
              <div className="flex items-start gap-2">
                {ex.pulse ? (
                  <span
                    className="mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse"
                    aria-hidden
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[oklch(0.18_0.01_80)]">{ex.title}</p>
                  <p className="mt-0.5 text-[12.5px] text-[oklch(0.42_0.01_80)]">{ex.context}</p>
                  <button
                    type="button"
                    className="mt-2 text-left font-atlas-mono text-[11px] font-medium text-[oklch(0.32_0.01_80)] underline decoration-[oklch(0.85_0.01_80)] underline-offset-2 hover:text-[oklch(0.18_0.01_80)]"
                  >
                    {ex.actionLabel}
                  </button>
                </div>
              </div>
            </article>
          ))}
          {overflow && !showAllExceptions ? (
            <button
              type="button"
              onClick={() => onShowAllExceptions(true)}
              className="w-full rounded-lg border border-transparent py-2 text-center font-atlas-mono text-[11.5px] font-medium text-[oklch(0.36_0.01_80)] hover:bg-[oklch(0.96_0.004_80)]"
            >
              See all {exceptions.length} →
            </button>
          ) : null}
        </div>
      )}

      <details className="overflow-hidden rounded-[10px] border border-[oklch(0.91_0.005_80)] bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-3 font-atlas-mono text-[10px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)] marker:hidden [&::-webkit-details-marker]:hidden">
          <span className="select-none">Pacing</span>
        </summary>
        <div className="space-y-3 border-t border-[oklch(0.94_0.004_80)] px-4 py-3">
          {MOCK_PACING.map((row) => (
            <div key={row.name}>
              <div className="flex justify-between font-atlas-mono text-[10.5px] text-[oklch(0.42_0.01_80)]">
                <span>{row.name}</span>
                <span>
                  {row.pct}% · {row.label}
                </span>
              </div>
              <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-[oklch(0.93_0.004_80)]">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-[oklch(0.72_0.06_145)]"
                  style={{ width: `${row.pct}%` }}
                />
                <div
                  className="absolute top-0 h-full w-px bg-[oklch(0.25_0.02_80)]"
                  style={{ left: `${nowPct}%` }}
                  title="Expected pacing (time of day)"
                />
              </div>
            </div>
          ))}
        </div>
      </details>

      <div className="rounded-[10px] border border-[oklch(0.91_0.005_80)] bg-white shadow-sm">
        <button
          type="button"
          aria-expanded={exchangeOpen}
          onClick={() => onExchangeOpen(!exchangeOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-left font-atlas-mono text-[10px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)] hover:bg-[oklch(0.99_0.004_80)]"
        >
          Live exchange
          <span className="text-[oklch(0.45_0.01_80)]">{exchangeOpen ? "−" : "+"}</span>
        </button>
        {exchangeOpen ? (
          <div className="border-t border-[oklch(0.94_0.004_80)] p-4">
            <AtlasExchangePulseCard {...exchange} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MetricChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "good" | "warn";
}): JSX.Element {
  const valCls =
    tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-amber-800" : "text-[oklch(0.18_0.01_80)]";
  return (
    <div className="px-3 py-3">
      <div className="font-atlas-mono text-[9.5px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
        {label}
      </div>
      <div className={`mt-1 font-atlas-mono text-sm font-semibold ${valCls}`}>{value}</div>
    </div>
  );
}
