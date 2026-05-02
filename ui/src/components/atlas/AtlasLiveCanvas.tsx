import type { AuctionResult, SettlementReceipt } from "@ade/shared";
import type { JSX } from "react";

export interface AtlasLiveCanvasProps {
  connected: boolean;
  paused: boolean;
  settlementCount: number;
  bidCount: number;
  listingCount: number;
  lastAuction: AuctionResult | null;
  lastReceipt: SettlementReceipt | null;
}

export function AtlasLiveCanvas({
  connected,
  paused,
  settlementCount,
  bidCount,
  listingCount,
  lastAuction,
  lastReceipt,
}: AtlasLiveCanvasProps): JSX.Element {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-[oklch(0.91_0.005_80)] bg-[oklch(0.97_0.005_80)] font-atlas">
      <div className="flex shrink-0 items-center gap-2 border-b border-[oklch(0.91_0.005_80)] px-5 py-3.5">
        <h2 className="text-[13px] font-semibold text-[oklch(0.18_0.01_80)]">Live exchange</h2>
        <span className="ml-auto font-atlas-mono text-[10.5px] text-[oklch(0.45_0.01_80)]">read-only</span>
      </div>
      <div className="flex-1 overflow-y-auto bg-[oklch(0.985_0.004_80)] p-5">
        <div className="overflow-hidden rounded-[10px] border border-[oklch(0.91_0.005_80)] bg-white shadow-sm">
          <div className="grid grid-cols-2 gap-0 border-b border-[oklch(0.94_0.004_80)] sm:grid-cols-4">
            <Vital label="SSE" value={connected ? "live" : "…"} ok={connected} />
            <Vital label="Demo" value={paused ? "paused" : "running"} ok={!paused} />
            <Vital label="Settlements" value={String(settlementCount)} />
            <Vital label="Bids (buf)" value={String(bidCount)} />
          </div>
          <div className="p-4">
            <h3 className="mb-2 font-atlas-mono text-[9.5px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
              Listings
            </h3>
            <p className="text-sm text-[oklch(0.22_0.01_80)]">{listingCount} active in inventory</p>
            {lastAuction && (
              <div className="mt-4 rounded-lg border border-[oklch(0.94_0.004_80)] bg-[oklch(0.99_0.004_80)] p-3">
                <div className="font-atlas-mono text-[9.5px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
                  Last auction
                </div>
                <p className="mt-1 text-sm text-[oklch(0.22_0.01_80)]">
                  Clearing <strong>{lastAuction.clearingPriceUsdc}</strong> USDC ·{" "}
                  <strong>{lastAuction.winnerBuyerAgentId}</strong>
                </p>
              </div>
            )}
            {lastReceipt && (
              <div className="mt-3 rounded-lg border border-[oklch(0.94_0.004_80)] p-3">
                <div className="font-atlas-mono text-[9.5px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
                  Last receipt
                </div>
                <p className="mt-1 font-atlas-mono text-xs text-[oklch(0.32_0.01_80)]">
                  {lastReceipt.status}
                  {lastReceipt.arcTxHash ? ` · ${lastReceipt.arcTxHash.slice(0, 10)}…` : ""}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Vital({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean;
}): JSX.Element {
  return (
    <div className="border-r border-[oklch(0.94_0.004_80)] px-3 py-3 last:border-r-0">
      <div className="font-atlas-mono text-[9.5px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
        {label}
      </div>
      <div className={`mt-1 font-atlas-mono text-sm font-semibold ${ok === true ? "text-emerald-700" : ok === false ? "text-amber-800" : "text-[oklch(0.18_0.01_80)]"}`}>
        {value}
      </div>
    </div>
  );
}
