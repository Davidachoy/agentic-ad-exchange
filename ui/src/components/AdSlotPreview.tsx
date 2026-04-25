import type { AdInventoryListing, AuctionResult, SettlementReceipt } from "@ade/shared";

interface Creative {
  headline: string;
  body: string;
  cta: string;
  bgFrom: string;
  bgTo: string;
}

const CREATIVES: Record<string, Creative> = {
  "buyer-luxuryco": {
    headline: "LuxuryCo · AW26 Collection",
    body: "Italian craftsmanship, redefined",
    cta: "Shop the Edit →",
    bgFrom: "#831843",
    bgTo: "#0c0a09",
  },
  "buyer-growthco": {
    headline: "GrowthCo · DevOps Platform",
    body: "Ship 10× faster with smart pipelines",
    cta: "Start Free Trial →",
    bgFrom: "#065f46",
    bgTo: "#1d4ed8",
  },
  "buyer-retailco": {
    headline: "RetailCo · Cart Recovery",
    body: "Your saved items — 20% off today",
    cta: "Complete Order →",
    bgFrom: "#b45309",
    bgTo: "#7c2d12",
  },
};

const DEFAULT_CREATIVE: Creative = {
  headline: "Premium Ad Placement",
  body: "Delivered via Arc nanopayments",
  cta: "Learn More →",
  bgFrom: "#0e7490",
  bgTo: "#1e3a5f",
};

export interface AdSlotPreviewProps {
  auction: AuctionResult;
  receipt: SettlementReceipt | null;
  listing: AdInventoryListing | null;
}

export function AdSlotPreview({ auction, receipt, listing }: AdSlotPreviewProps): JSX.Element {
  const creative = CREATIVES[auction.winnerBuyerAgentId] ?? DEFAULT_CREATIVE;
  const size = listing?.size ?? "300x250";
  const [wStr, hStr] = size.split("x");
  const aspectPct = ((Number(hStr) / Number(wStr)) * 100).toFixed(1);

  const statusColor =
    receipt == null
      ? "text-yellow-400"
      : receipt.status === "confirmed"
        ? "text-exchange-accent"
        : receipt.status === "failed"
          ? "text-exchange-warn"
          : "text-yellow-400";

  const statusLabel =
    receipt == null
      ? "pending…"
      : receipt.status === "confirmed"
        ? "confirmed ✓"
        : receipt.status === "failed"
          ? "failed ✗"
          : receipt.status;

  return (
    <div className="mt-4 rounded-xl border border-exchange-accent/40 bg-exchange-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-exchange-accent">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-exchange-accent" />
          Ad Slot — Live
        </span>
        <span className="text-xs text-slate-400">{size}</span>
      </div>

      <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingBottom: `${aspectPct}%` }}>
        <div
          className="absolute inset-0 flex flex-col items-start justify-center p-4"
          style={{ background: `linear-gradient(135deg, ${creative.bgFrom}, ${creative.bgTo})` }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Sponsored</p>
          <p className="mt-1 text-base font-bold leading-tight text-white">{creative.headline}</p>
          <p className="mt-1 text-sm text-white/80">{creative.body}</p>
          <span className="mt-3 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
            {creative.cta}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-slate-400">Clearing price</p>
          <p className="font-semibold text-slate-100">${auction.clearingPriceUsdc} USDC</p>
        </div>
        <div>
          <p className="text-slate-400">Settlement</p>
          <p className={`font-semibold ${statusColor}`}>{statusLabel}</p>
        </div>
        <div>
          <p className="text-slate-400">Winner</p>
          <p className="truncate font-mono text-slate-300">{auction.winnerBuyerAgentId}</p>
        </div>
        <div>
          <p className="text-slate-400">Format</p>
          <p className="text-slate-300">
            {listing?.format ?? "banner"} · {listing?.adType ?? "display"}
          </p>
        </div>
      </div>
    </div>
  );
}
