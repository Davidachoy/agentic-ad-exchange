import type { JSX } from "react";

import { YIELD_PLACEMENT_ROWS } from "./sellerYieldConstants.js";
import type { YieldRevenuePeriod } from "./yieldPanelTypes.js";

const PERIODS: { id: YieldRevenuePeriod; label: string }[] = [
  { id: "today", label: "TODAY" },
  { id: "7d", label: "LAST 7D" },
  { id: "total", label: "TOTAL" },
  { id: "custom", label: "CUSTOM" },
];

export interface SellerYieldRevenueTabProps {
  period: YieldRevenuePeriod;
  onPeriod: (p: YieldRevenuePeriod) => void;
  applyFlight: Record<string, boolean>;
  onApplyFlight: (key: string, v: boolean) => void;
}

export function SellerYieldRevenueTab({
  period,
  onPeriod,
  applyFlight,
  onApplyFlight,
}: SellerYieldRevenueTabProps): JSX.Element {
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
          Yield agent active · $4,210 revenue today · 67% fill rate · +$840 vs floor benchmark
        </p>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-[oklch(0.91_0.005_80)] bg-white shadow-sm">
        <div className="border-b border-[oklch(0.94_0.004_80)] px-3 py-2 font-atlas-mono text-[9.5px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
          By placement
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-b border-[oklch(0.94_0.004_80)] font-atlas-mono text-[9.5px] uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
                <th className="px-3 py-2 font-semibold">Placement</th>
                <th className="px-2 py-2 font-semibold">Imps</th>
                <th className="px-2 py-2 font-semibold">Fill%</th>
                <th className="px-2 py-2 font-semibold">eCPM</th>
                <th className="px-2 py-2 font-semibold">Revenue</th>
                <th className="px-3 py-2 font-semibold">vs floor</th>
              </tr>
            </thead>
            <tbody>
              {YIELD_PLACEMENT_ROWS.map((row) => (
                <tr
                  key={row.placement}
                  className={`border-b border-[oklch(0.96_0.004_80)] last:border-0 ${
                    row.tone === "bad"
                      ? "bg-red-50/90"
                      : row.tone === "warn"
                        ? "bg-amber-50/90"
                        : "bg-[oklch(0.995_0.003_80)]"
                  }`}
                >
                  <td className="px-3 py-2 font-medium text-[oklch(0.22_0.01_80)]">{row.placement}</td>
                  <td className="px-2 py-2 font-atlas-mono text-[oklch(0.32_0.01_80)]">{row.imps}</td>
                  <td className="px-2 py-2 font-atlas-mono">{row.fill}</td>
                  <td className="px-2 py-2 font-atlas-mono">{row.ecpm}</td>
                  <td className="px-2 py-2 font-atlas-mono">{row.revenue}</td>
                  <td className="px-3 py-2 font-atlas-mono font-medium">{row.vsFloor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="mb-2 font-atlas-mono text-[9.5px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
          Top yield decisions
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-[10px] border border-[oklch(0.91_0.005_80)] border-l-[3px] border-l-emerald-500 bg-white p-3 shadow-sm">
            <div className="font-atlas-mono text-[9px] font-semibold uppercase text-emerald-800">Best call</div>
            <p className="mt-2 text-[11.5px] leading-snug text-[oklch(0.28_0.01_80)]">
              Held homepage floor — demand stayed above $2.14 all day
            </p>
          </div>
          <div className="rounded-[10px] border border-[oklch(0.91_0.005_80)] border-l-[3px] border-l-amber-500 bg-white p-3 shadow-sm">
            <div className="font-atlas-mono text-[9px] font-semibold uppercase text-amber-900">Floor alert</div>
            <p className="mt-2 text-[11.5px] leading-snug text-[oklch(0.28_0.01_80)]">
              CTV pre-roll at $4.20 cutting demand — 34% fill vs 71% benchmark
            </p>
          </div>
          <div className="rounded-[10px] border border-[oklch(0.91_0.005_80)] border-l-[3px] border-l-blue-500 bg-white p-3 shadow-sm">
            <div className="font-atlas-mono text-[9px] font-semibold uppercase text-blue-900">Learned</div>
            <p className="mt-2 text-[11.5px] leading-snug text-[oklch(0.28_0.01_80)]">
              Mobile banner floor $0.80 leaving ~$0.40/imp on table
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 font-atlas-mono text-[9.5px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
          Apply to next flight
        </div>
        <ul className="space-y-2 text-[12.5px] text-[oklch(0.28_0.01_80)]">
          <li className="flex items-start gap-2">
            <input
              id="flt-ctv"
              type="checkbox"
              className="mt-1"
              checked={applyFlight.ctv ?? false}
              onChange={(e) => onApplyFlight("ctv", e.target.checked)}
            />
            <label htmlFor="flt-ctv">Drop CTV pre-roll floor to $3.20</label>
          </li>
          <li className="flex items-start gap-2">
            <input
              id="flt-mob"
              type="checkbox"
              className="mt-1"
              checked={applyFlight.mobile ?? false}
              onChange={(e) => onApplyFlight("mobile", e.target.checked)}
            />
            <label htmlFor="flt-mob">Raise mobile banner floor to $1.20</label>
          </li>
          <li className="flex items-start gap-2">
            <input
              id="flt-home"
              type="checkbox"
              className="mt-1"
              checked={applyFlight.homepage ?? false}
              onChange={(e) => onApplyFlight("homepage", e.target.checked)}
            />
            <label htmlFor="flt-home">Keep homepage floor at $1.85 — well calibrated</label>
          </li>
        </ul>
      </div>
    </div>
  );
}
