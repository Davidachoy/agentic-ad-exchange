import type { AuctionResult, SettlementReceipt } from "@ade/shared";
import type { JSX } from "react";
import { useId } from "react";

import type { ControlStateHandle } from "../../hooks/useControlState.js";
import { AtlasAnalyzeMode } from "./AtlasAnalyzeMode.js";
import { AtlasCreateMode } from "./AtlasCreateMode.js";
import { AtlasMonitorMode } from "./AtlasMonitorMode.js";
import { AtlasReviewMode } from "./AtlasReviewMode.js";
import type { AtlasPanelMode } from "./atlasRightPanelTypes.js";
import { useAtlasRightPanelState } from "./useAtlasRightPanelState.js";

export interface AtlasRightPanelProps {
  connected: boolean;
  paused: boolean;
  settlementCount: number;
  bidCount: number;
  listingCount: number;
  lastAuction: AuctionResult | null;
  lastReceipt: SettlementReceipt | null;
  control: ControlStateHandle;
}

const MODES: { id: AtlasPanelMode; label: string; badge?: "review" }[] = [
  { id: "monitor", label: "Monitor" },
  { id: "create", label: "Create" },
  { id: "review", label: "Review", badge: "review" },
  { id: "analyze", label: "Analyze" },
];

export function AtlasRightPanel({
  connected,
  paused,
  settlementCount,
  bidCount,
  listingCount,
  lastAuction,
  lastReceipt,
  control,
}: AtlasRightPanelProps): JSX.Element {
  const s = useAtlasRightPanelState();
  const tablistId = useId();

  const exchange = {
    connected,
    paused,
    settlementCount,
    bidCount,
    listingCount,
    lastAuction,
    lastReceipt,
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-[oklch(0.91_0.005_80)] bg-[oklch(0.97_0.005_80)] font-atlas">
      <div className="flex shrink-0 flex-col gap-2 border-b border-[oklch(0.91_0.005_80)] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[13px] font-semibold text-[oklch(0.18_0.01_80)]">Atlas workspace</h2>
          <span className="font-atlas-mono text-[10.5px] text-[oklch(0.45_0.01_80)]">demo</span>
        </div>
        <div
          id={tablistId}
          role="tablist"
          aria-label="Atlas workspace modes"
          className="flex flex-wrap gap-1 rounded-lg border border-[oklch(0.91_0.005_80)] bg-[oklch(0.99_0.004_80)] p-1"
        >
          {MODES.map((m) => {
            const selected = s.activeMode === m.id;
            const reviewCount = m.badge === "review" ? s.pendingDecisions.length : 0;
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
                {m.badge === "review" && reviewCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1 font-atlas-mono text-[9px] font-bold text-white">
                    {reviewCount}
                  </span>
                ) : null}
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
        {s.activeMode === "monitor" ? (
          <AtlasMonitorMode
            exceptions={s.exceptions}
            showAllExceptions={s.showAllExceptions}
            onShowAllExceptions={s.setShowAllExceptions}
            exchangeOpen={s.exchangePulseOpen}
            onExchangeOpen={s.setExchangePulseOpen}
            exchange={exchange}
            control={control}
            settledDisplay={s.settledDisplay}
            winRateDisplay={s.winRateDisplay}
            burnDisplay={s.burnDisplay}
            savedDisplay={s.savedDisplay}
            autoExecutedToday={s.autoExecutedToday}
            totalDecisionsToday={s.totalDecisionsToday}
          />
        ) : null}
        {s.activeMode === "create" ? (
          <AtlasCreateMode
            step={s.createStep}
            onStep={s.setCreateStep}
            objectiveText={s.objectiveText}
            onObjectiveText={s.setObjectiveText}
            parsedChips={s.parsedChips}
            ssps={s.ssps}
            onToggleSsp={s.toggleSsp}
            dealsOpen={s.dealsOpen}
            onDealsOpen={s.setDealsOpen}
            maxCpm={s.maxCpm}
            onMaxCpm={s.setMaxCpm}
            dailyDelta={s.dailyDelta}
            onDailyDelta={s.setDailyDelta}
            approvalGate={s.approvalGate}
            onApprovalGate={s.setApprovalGate}
            rotation={s.rotation}
            onRotation={s.setRotation}
            policySummary={s.policySummary}
            onLaunch={s.launchCampaign}
            onSaveDraft={s.saveDraft}
          />
        ) : null}
        {s.activeMode === "review" ? (
          <AtlasReviewMode
            pending={s.pendingDecisions}
            resolved={s.resolvedHistory}
            expandedId={s.expandedReviewId}
            onExpandedId={s.setExpandedReviewId}
            dontAskAgain={s.dontAskAgain}
            onDontAskAgain={s.setDontAskAgain}
            exitingIds={s.exitingDecisionIds}
            onResolve={s.resolveDecision}
            autoExecutedToday={s.autoExecutedToday}
          />
        ) : null}
        {s.activeMode === "analyze" ? (
          <AtlasAnalyzeMode
            period={s.analyzePeriod}
            onPeriod={s.setAnalyzePeriod}
            applyNext={s.applyNext}
            onApplyNext={s.setApplyNext}
          />
        ) : null}
      </div>
    </section>
  );
}
