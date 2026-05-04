import type { JSX } from "react";

import type { YieldFloorRow } from "./yieldPanelTypes.js";

export interface SellerYieldFloorsTabProps {
  rows: YieldFloorRow[];
  floorDrafts: Record<string, string>;
  onFloorDraft: (id: string, v: string) => void;
  editingFloorId: string | null;
  onEditingFloorId: (id: string | null) => void;
  onCommitFloor: (id: string) => void;
}

function signalLabel(signal: YieldFloorRow["signal"]): string {
  if (signal === "calibrated") {
    return "Calibrated";
  }
  if (signal === "too_high") {
    return "Too high";
  }
  return "Too low";
}

function signalClass(signal: YieldFloorRow["signal"]): string {
  if (signal === "calibrated") {
    return "text-emerald-700";
  }
  if (signal === "too_high") {
    return "text-red-700";
  }
  return "text-amber-700";
}

export function SellerYieldFloorsTab({
  rows,
  floorDrafts,
  onFloorDraft,
  editingFloorId,
  onEditingFloorId,
  onCommitFloor,
}: SellerYieldFloorsTabProps): JSX.Element {
  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-[oklch(0.4_0.01_80)]">Placements, floors, and fill signals (demo).</p>
      <ul className="list-none space-y-3 p-0">
        {rows.map((row) => (
          <li key={row.id} className="rounded-[10px] border border-[oklch(0.91_0.005_80)] bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-[13px] font-semibold text-[oklch(0.22_0.01_80)]">{row.placement}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 font-atlas-mono text-[11px] text-[oklch(0.4_0.01_80)]">
                  <span>Floor {row.floor}</span>
                  <span>·</span>
                  <span>Fill {row.fillPct}</span>
                  <span>·</span>
                  <span className={signalClass(row.signal)}>{signalLabel(row.signal)}</span>
                </div>
              </div>
              {editingFloorId === row.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    className="w-28 rounded-md border border-[oklch(0.88_0.005_80)] px-2 py-1 font-atlas-mono text-[12px]"
                    value={floorDrafts[row.id] ?? row.floor}
                    onChange={(e) => onFloorDraft(row.id, e.target.value)}
                    aria-label={`New floor for ${row.placement}`}
                  />
                  <button
                    type="button"
                    className="rounded-md bg-[oklch(0.18_0.01_80)] px-2 py-1 text-[11px] font-semibold text-white"
                    onClick={() => onCommitFloor(row.id)}
                  >
                    Save
                  </button>
                  <button type="button" className="text-[11px] text-[oklch(0.45_0.01_80)]" onClick={() => onEditingFloorId(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="rounded-md border border-[oklch(0.91_0.005_80)] px-2 py-1 text-[11px] font-medium text-[oklch(0.32_0.01_80)] hover:bg-[oklch(0.97_0.005_80)]"
                  onClick={() => {
                    onFloorDraft(row.id, row.floor);
                    onEditingFloorId(row.id);
                  }}
                >
                  Edit floor
                </button>
              )}
            </div>
            <p className="mt-2 text-[11.5px] leading-snug text-[oklch(0.5_0.01_80)]">{row.hint}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
