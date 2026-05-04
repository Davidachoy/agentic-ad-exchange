import type { JSX } from "react";

import { MOCK_ANALYZE_ROWS } from "./atlasMockCampaign.js";
import type { AnalyzePeriod } from "./atlasRightPanelTypes.js";

export interface AtlasAnalyzeModeProps {
  period: AnalyzePeriod;
  onPeriod: (p: AnalyzePeriod) => void;
  applyNext: Record<string, boolean>;
  onApplyNext: (key: string, v: boolean) => void;
}

const PERIODS: { id: AnalyzePeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7d" },
  { id: "campaign", label: "Campaign total" },
  { id: "custom", label: "Custom" },
];

export function AtlasAnalyzeMode({ period, onPeriod, applyNext, onApplyNext }: AtlasAnalyzeModeProps): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPeriod(p.id)}
            className={`rounded-full border px-3 py-1.5 font-atlas-mono text-[10.5px] font-semibold uppercase tracking-wide ${
              period === p.id
                ? "border-[oklch(0.18_0.01_80)] bg-[oklch(0.18_0.01_80)] text-white"
                : "border-[oklch(0.91_0.005_80)] bg-white text-[oklch(0.4_0.01_80)]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="rounded-[10px] border border-[oklch(0.91_0.005_80)] bg-white p-4 shadow-sm">
        <div className="font-atlas-mono text-[9.5px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
          Executive summary
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-[oklch(0.22_0.01_80)]">
          Atlas ran 14h 22m · 63.1% win rate · $184k settled · +$1,284 vs benchmark
        </p>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-[oklch(0.91_0.005_80)] bg-white shadow-sm">
        <div className="border-b border-[oklch(0.94_0.004_80)] px-3 py-2 font-atlas-mono text-[9.5px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
          By channel
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-b border-[oklch(0.94_0.004_80)] font-atlas-mono text-[9.5px] uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
                <th className="px-3 py-2 font-semibold">Channel</th>
                <th className="px-2 py-2 font-semibold">Imps</th>
                <th className="px-2 py-2 font-semibold">Win%</th>
                <th className="px-2 py-2 font-semibold">VCR</th>
                <th className="px-2 py-2 font-semibold">eCPM</th>
                <th className="px-3 py-2 font-semibold">vs Goal</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ANALYZE_ROWS.map((row) => (
                <tr
                  key={row.channel}
                  className={`border-b border-[oklch(0.96_0.004_80)] last:border-0 ${
                    row.tone === "beat"
                      ? "bg-emerald-50/80"
                      : row.tone === "miss"
                        ? "bg-red-50/80"
                        : "bg-[oklch(0.995_0.003_80)]"
                  }`}
                >
                  <td className="px-3 py-2 font-medium text-[oklch(0.22_0.01_80)]">{row.channel}</td>
                  <td className="px-2 py-2 font-atlas-mono text-[oklch(0.32_0.01_80)]">{row.imps}</td>
                  <td className="px-2 py-2 font-atlas-mono">{row.winPct}</td>
                  <td className="px-2 py-2 font-atlas-mono">{row.vcr}</td>
                  <td className="px-2 py-2 font-atlas-mono">{row.ecpm}</td>
                  <td className="px-3 py-2 font-atlas-mono font-medium">{row.vsGoal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="mb-2 font-atlas-mono text-[9.5px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
          Top Atlas decisions
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-[10px] border border-[oklch(0.91_0.005_80)] border-l-[3px] border-l-emerald-500 bg-white p-3 shadow-sm">
            <div className="font-atlas-mono text-[9px] font-semibold uppercase text-emerald-800">Best call</div>
            <p className="mt-2 text-[11.5px] leading-snug text-[oklch(0.28_0.01_80)]">
              Held bid floor on Meridian when VCR was already above goal.
            </p>
          </div>
          <div className="rounded-[10px] border border-[oklch(0.91_0.005_80)] border-l-[3px] border-l-amber-500 bg-white p-3 shadow-sm">
            <div className="font-atlas-mono text-[9px] font-semibold uppercase text-amber-900">Close call</div>
            <p className="mt-2 text-[11.5px] leading-snug text-[oklch(0.28_0.01_80)]">
              Almost shifted budget to Tubi; paused when win-rate dipped.
            </p>
          </div>
          <div className="rounded-[10px] border border-[oklch(0.91_0.005_80)] border-l-[3px] border-l-sky-500 bg-white p-3 shadow-sm">
            <div className="font-atlas-mono text-[9px] font-semibold uppercase text-sky-900">Learned</div>
            <p className="mt-2 text-[11.5px] leading-snug text-[oklch(0.28_0.01_80)]">
              Roku dayparts after 9pm outperform for Solstice 1P.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[10px] border border-[oklch(0.91_0.005_80)] bg-white p-4 shadow-sm">
        <div className="font-atlas-mono text-[9.5px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
          Apply to next campaign
        </div>
        <ul className="mt-3 list-none space-y-2 p-0">
          <li>
            <label className="flex cursor-pointer items-start gap-2 text-[12.5px] text-[oklch(0.28_0.01_80)]">
              <input
                type="checkbox"
                checked={Boolean(applyNext.pacing)}
                onChange={(e) => onApplyNext("pacing", e.target.checked)}
                className="mt-0.5 rounded border-[oklch(0.91_0.005_80)]"
              />
              Carry pacing guardrails (Hulu / Meridian on-track targets)
            </label>
          </li>
          <li>
            <label className="flex cursor-pointer items-start gap-2 text-[12.5px] text-[oklch(0.28_0.01_80)]">
              <input
                type="checkbox"
                checked={Boolean(applyNext.policy)}
                onChange={(e) => onApplyNext("policy", e.target.checked)}
                className="mt-0.5 rounded border-[oklch(0.91_0.005_80)]"
              />
              Reuse approval gates and delta caps from this flight
            </label>
          </li>
          <li>
            <label className="flex cursor-pointer items-start gap-2 text-[12.5px] text-[oklch(0.28_0.01_80)]">
              <input
                type="checkbox"
                checked={Boolean(applyNext.creative)}
                onChange={(e) => onApplyNext("creative", e.target.checked)}
                className="mt-0.5 rounded border-[oklch(0.91_0.005_80)]"
              />
              Prefer auto VCR rotation for CTV line items
            </label>
          </li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-[oklch(0.91_0.005_80)] bg-white px-4 py-2 text-[12.5px] font-medium"
        >
          Download PDF
        </button>
        <button
          type="button"
          className="rounded-lg bg-[oklch(0.18_0.01_80)] px-4 py-2 text-[12.5px] font-semibold text-white"
        >
          Share with client →
        </button>
      </div>
    </div>
  );
}
