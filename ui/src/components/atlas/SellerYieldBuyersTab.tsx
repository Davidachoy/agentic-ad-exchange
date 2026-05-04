import type { JSX } from "react";

import type { YieldBuyerRow } from "./yieldPanelTypes.js";

function statusStyle(s: YieldBuyerRow["status"]): string {
  if (s === "blocked") {
    return "text-red-700";
  }
  if (s === "preferred") {
    return "text-emerald-700";
  }
  return "text-[oklch(0.38_0.01_80)]";
}

export interface SellerYieldBuyersTabProps {
  buyers: YieldBuyerRow[];
  onCycleStatus: (id: string) => void;
}

export function SellerYieldBuyersTab({ buyers, onCycleStatus }: SellerYieldBuyersTabProps): JSX.Element {
  return (
    <div className="overflow-hidden rounded-[10px] border border-[oklch(0.91_0.005_80)] bg-white shadow-sm">
      <div className="border-b border-[oklch(0.94_0.004_80)] px-3 py-2 font-atlas-mono text-[9.5px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
        DSPs winning inventory
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-left text-[12px]">
          <thead>
            <tr className="border-b border-[oklch(0.94_0.004_80)] font-atlas-mono text-[9.5px] uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
              <th className="px-3 py-2 font-semibold">Buyer</th>
              <th className="px-2 py-2 font-semibold">Wins today</th>
              <th className="px-2 py-2 font-semibold">Avg CPM</th>
              <th className="px-2 py-2 font-semibold">% revenue</th>
              <th className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {buyers.map((b) => (
              <tr key={b.id} className="border-b border-[oklch(0.96_0.004_80)] last:border-0">
                <td className="px-3 py-2 font-medium text-[oklch(0.22_0.01_80)]">{b.name}</td>
                <td className="px-2 py-2 font-atlas-mono">{b.winsToday}</td>
                <td className="px-2 py-2 font-atlas-mono">{b.avgCpm}</td>
                <td className="px-2 py-2 font-atlas-mono">{b.pctRevenue}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className={`rounded-full border border-[oklch(0.91_0.005_80)] bg-[oklch(0.99_0.003_80)] px-2 py-1 font-atlas-mono text-[10px] font-semibold uppercase hover:bg-[oklch(0.96_0.004_80)] ${statusStyle(b.status)}`}
                    onClick={() => onCycleStatus(b.id)}
                  >
                    {b.status}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
