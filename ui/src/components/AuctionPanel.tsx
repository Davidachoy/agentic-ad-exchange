import type { AdInventoryListing, AuctionResult, SettlementReceipt } from "@ade/shared";

export interface AuctionPanelProps {
  listings: AdInventoryListing[];
  activeListingId: string | null;
  onSelectListing: (id: string) => void;
  onRunAuction: () => Promise<void>;
  running: boolean;
  lastAuction: AuctionResult | null;
  lastReceipt: SettlementReceipt | null;
}

export function AuctionPanel({
  listings,
  activeListingId,
  onSelectListing,
  onRunAuction,
  running,
  lastAuction,
  lastReceipt,
}: AuctionPanelProps): JSX.Element {
  const noListings = listings.length === 0;

  const receiptForCurrentAuction =
    lastReceipt && lastAuction && lastReceipt.auctionId === lastAuction.auctionId
      ? lastReceipt
      : null;
  const settlementLabel = receiptForCurrentAuction?.status ?? "pending…";
  const receiptColor =
    receiptForCurrentAuction == null
      ? "text-yellow-400"
      : receiptForCurrentAuction.status === "confirmed"
        ? "text-exchange-accent"
        : receiptForCurrentAuction.status === "failed"
          ? "text-exchange-warn"
          : "text-yellow-400";

  return (
    <section
      role="region"
      aria-label="Auction engine panel"
      className="flex flex-col rounded-xl border border-slate-800 bg-exchange-card p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Exchange Engine</h2>
          <p className="text-xs text-slate-400">second-price sealed-bid</p>
        </div>
        <span className="rounded-full bg-teal-900/40 px-2 py-0.5 text-xs text-teal-300">
          Step 3
        </span>
      </div>

      {/* Listing selector */}
      <div className="mt-4">
        <label className="text-xs text-slate-400" htmlFor="listing-select">
          Ad slot
        </label>
        {noListings ? (
          <p className="mt-1 text-sm text-slate-500">Register a slot first (Step 1).</p>
        ) : (
          <select
            id="listing-select"
            value={activeListingId ?? ""}
            onChange={(e) => onSelectListing(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-exchange-accent focus:outline-none"
          >
            {listings.map((l) => (
              <option key={l.listingId} value={l.listingId}>
                {l.format} {l.size} · floor ${l.floorPriceUsdc}
              </option>
            ))}
          </select>
        )}
      </div>

      <button
        onClick={() => void onRunAuction()}
        disabled={noListings || running}
        className="mt-3 w-full rounded-lg border border-teal-700/50 bg-teal-900/20 px-4 py-2.5 text-sm font-medium text-teal-300 transition-colors hover:bg-teal-900/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {running ? "Running auction…" : "▶ Run Auction (manual bids)"}
      </button>
      <p className="mt-1 text-center text-xs text-slate-500">
        Auctions clear automatically; this button forces an early run.
      </p>

      {/* Last auction result */}
      {lastAuction ? (
        <div className="mt-4 flex-1 rounded-lg border border-slate-700 bg-slate-800/40 p-4 text-xs">
          <p className="font-semibold uppercase tracking-wide text-slate-400">Last result</p>
          <div className="mt-2 space-y-2">
            <Row label="Winner" value={lastAuction.winnerBuyerAgentId} accent />
            <Row label="Clearing price" value={`$${lastAuction.clearingPriceUsdc} USDC`} accent />
            <Row label="Winning bid" value={`$${lastAuction.winningBidUsdc} USDC`} />
            <Row label="Seller" value={lastAuction.sellerAgentId} />
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Settlement</span>
              <span className={`font-semibold ${receiptColor}`}>{settlementLabel}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-700 p-6">
          <p className="text-center text-sm text-slate-500">
            No auction run yet.
            <br />
            Place bids, then click Run Auction.
          </p>
        </div>
      )}
    </section>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold ${accent ? "text-exchange-accent" : "text-slate-200"}`}>
        {value}
      </span>
    </div>
  );
}
