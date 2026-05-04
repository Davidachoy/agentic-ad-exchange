import type { JSX } from "react";
import { useId } from "react";

import { SellerYieldBuyersTab } from "./SellerYieldBuyersTab.js";
import { SellerYieldDealsTab } from "./SellerYieldDealsTab.js";
import { SellerYieldFloorsTab } from "./SellerYieldFloorsTab.js";
import { SellerYieldRevenueTab } from "./SellerYieldRevenueTab.js";
import { useSellerYieldPanelState } from "./useSellerYieldPanelState.js";
import type { YieldPanelMode } from "./yieldPanelTypes.js";

const MODES: { id: YieldPanelMode; label: string }[] = [
  { id: "revenue", label: "Revenue" },
  { id: "floors", label: "Floors" },
  { id: "deals", label: "Deals" },
  { id: "buyers", label: "Buyers" },
];

export interface SellerYieldRightPanelProps {
  onNewDealInChat: () => void;
}

export function SellerYieldRightPanel({ onNewDealInChat }: SellerYieldRightPanelProps): JSX.Element {
  const s = useSellerYieldPanelState();
  const tablistId = useId();

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-[oklch(0.91_0.005_80)] bg-[oklch(0.97_0.005_80)] font-atlas">
      <div className="flex shrink-0 flex-col gap-2 border-b border-[oklch(0.91_0.005_80)] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[13px] font-semibold text-[oklch(0.18_0.01_80)]">Yield workspace</h2>
          <span className="font-atlas-mono text-[10.5px] text-[oklch(0.45_0.01_80)]">demo</span>
        </div>
        <div
          id={tablistId}
          role="tablist"
          aria-label="Yield workspace modes"
          className="flex flex-wrap gap-1 rounded-lg border border-[oklch(0.91_0.005_80)] bg-[oklch(0.99_0.004_80)] p-1"
        >
          {MODES.map((m) => {
            const selected = s.activeMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={selected}
                id={`${tablistId}-${m.id}`}
                onClick={() => s.setActiveMode(m.id)}
                className={`relative flex flex-1 items-center justify-center gap-1 rounded-md py-2 text-center font-atlas-mono text-[10px] font-semibold uppercase tracking-wide min-w-[4.5rem] ${
                  selected ? "bg-white text-[oklch(0.18_0.01_80)] shadow-sm" : "text-[oklch(0.48_0.01_80)]"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        aria-labelledby={`${tablistId}-${s.activeMode}`}
        className={`min-h-0 flex-1 overflow-y-auto bg-[oklch(0.985_0.004_80)] p-5 transition-opacity duration-200 ${
          s.panelEntering ? "opacity-0" : "opacity-100"
        }`}
      >
        {s.activeMode === "revenue" ? (
          <SellerYieldRevenueTab
            period={s.revenuePeriod}
            onPeriod={s.setRevenuePeriod}
            applyFlight={s.applyFlight}
            onApplyFlight={s.setApplyFlight}
          />
        ) : null}
        {s.activeMode === "floors" ? (
          <SellerYieldFloorsTab
            rows={s.floorRows}
            floorDrafts={s.floorDrafts}
            onFloorDraft={s.setFloorDraft}
            editingFloorId={s.editingFloorId}
            onEditingFloorId={s.setEditingFloorId}
            onCommitFloor={s.commitFloorDraft}
          />
        ) : null}
        {s.activeMode === "deals" ? (
          <SellerYieldDealsTab
            deals={s.deals}
            expandedDealIds={s.expandedDealIds}
            onToggleDeal={s.toggleDealExpanded}
            onNewDeal={onNewDealInChat}
          />
        ) : null}
        {s.activeMode === "buyers" ? <SellerYieldBuyersTab buyers={s.buyers} onCycleStatus={s.cycleBuyerStatus} /> : null}
      </div>
    </section>
  );
}
