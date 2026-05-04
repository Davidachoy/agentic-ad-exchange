import type { JSX } from "react";

import type { YieldDealRow } from "./yieldPanelTypes.js";

function badgeClass(status: YieldDealRow["status"]): string {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }
  if (status === "draft") {
    return "border-slate-200 bg-slate-50 text-slate-800";
  }
  return "border-amber-200 bg-amber-50 text-amber-950";
}

export interface SellerYieldDealsTabProps {
  deals: YieldDealRow[];
  expandedDealIds: Set<string>;
  onToggleDeal: (id: string) => void;
  onNewDeal: () => void;
}

export function SellerYieldDealsTab({ deals, expandedDealIds, onToggleDeal, onNewDeal }: SellerYieldDealsTabProps): JSX.Element {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onNewDeal}
        className="w-full rounded-lg border border-dashed border-[oklch(0.72_0.006_80)] bg-white py-2.5 text-[12.5px] font-semibold text-[oklch(0.28_0.01_80)] hover:bg-[oklch(0.98_0.004_80)]"
      >
        + New deal
      </button>
      <ul className="list-none space-y-2 p-0">
        {deals.map((d) => {
          const open = expandedDealIds.has(d.id);
          return (
            <li key={d.id} className="rounded-[10px] border border-[oklch(0.91_0.005_80)] bg-white shadow-sm">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                onClick={() => onToggleDeal(d.id)}
                aria-expanded={open}
              >
                <span className="text-[13px] font-semibold text-[oklch(0.22_0.01_80)]">{d.name}</span>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 font-atlas-mono text-[9px] font-semibold uppercase ${badgeClass(d.status)}`}
                >
                  {d.status}
                </span>
              </button>
              {open ? (
                <div className="border-t border-[oklch(0.94_0.004_80)] px-3 py-2 font-atlas-mono text-[11.5px] text-[oklch(0.35_0.01_80)]">
                  <div>CPM {d.cpm}</div>
                  <div>Duration {d.duration}</div>
                  <div>Imps/mo {d.impsPerMo}</div>
                  <div>Buyer {d.buyer}</div>
                  <div className="mt-1 text-[10.5px] text-[oklch(0.5_0.01_80)]">Deal ID {d.id}</div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
