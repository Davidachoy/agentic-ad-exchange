import type { AuctionResult, SettlementReceipt } from "@ade/shared";
import type { JSX } from "react";

export interface AtlasExchangePulseCardProps {
  connected: boolean;
  paused: boolean;
  settlementCount: number;
  bidCount: number;
  listingCount: number;
  lastAuction: AuctionResult | null;
  lastReceipt: SettlementReceipt | null;
}

export function AtlasExchangePulseCard({
  connected,
  paused,
  settlementCount,
  bidCount,
  listingCount,
  lastAuction,
  lastReceipt,
}: AtlasExchangePulseCardProps): JSX.Element {
  return (
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
      <div
        className={`mt-1 font-atlas-mono text-sm font-semibold ${
          ok === true ? "text-emerald-700" : ok === false ? "text-amber-800" : "text-[oklch(0.18_0.01_80)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
