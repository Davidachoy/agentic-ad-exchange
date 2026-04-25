import type { AdInventoryListing, AuctionResult, BidRequest, SettlementReceipt } from "@ade/shared";

import { AdSlotPreview } from "./AdSlotPreview.js";

export interface BuyerPanelProps {
  bids: BidRequest[];
  onPlaceBid: (buyer: "A" | "B") => Promise<void>;
  biddingA: boolean;
  biddingB: boolean;
  lastAuction: AuctionResult | null;
  lastReceipt: SettlementReceipt | null;
  activeListing: AdInventoryListing | null;
}

export function BuyerPanel({
  bids,
  onPlaceBid,
  biddingA,
  biddingB,
  lastAuction,
  lastReceipt,
  activeListing,
}: BuyerPanelProps): JSX.Element {
  return (
    <section
      role="region"
      aria-label="Buyer agents panel"
      className="flex flex-col rounded-xl border border-slate-800 bg-exchange-card p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Buyer Agents</h2>
          <p className="text-xs text-slate-400">alpha · beta</p>
        </div>
        <span className="rounded-full bg-blue-900/40 px-2 py-0.5 text-xs text-blue-300">
          Step 2
        </span>
      </div>

      {/* Bid queue */}
      <div className="mt-4">
        <p className="text-xs text-slate-400">Bid queue ({bids.length})</p>
        {bids.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">No active bids — place one below.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {bids.map((b) => (
              <li
                key={b.bidId}
                className="rounded-lg border border-slate-700 bg-slate-800/40 p-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{b.buyerAgentId}</span>
                  <span className="font-semibold text-exchange-accent">${b.bidAmountUsdc}</span>
                </div>
                <div className="mt-0.5 text-slate-500">
                  {b.targeting.format} {b.targeting.size}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bid buttons */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => void onPlaceBid("A")}
          disabled={biddingA}
          className="rounded-lg border border-blue-700/50 bg-blue-900/20 px-3 py-2.5 text-xs font-medium text-blue-300 transition-colors hover:bg-blue-900/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="block">{biddingA ? "Bidding…" : "Bid $0.008"}</span>
          <span className="block text-blue-400/60">Buyer Alpha</span>
        </button>
        <button
          onClick={() => void onPlaceBid("B")}
          disabled={biddingB}
          className="rounded-lg border border-indigo-700/50 bg-indigo-900/20 px-3 py-2.5 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-900/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="block">{biddingB ? "Bidding…" : "Bid $0.006"}</span>
          <span className="block text-indigo-400/60">Buyer Beta</span>
        </button>
      </div>

      <p className="mt-2 text-center text-xs text-slate-500">
        Compete: highest bid wins · second-price + $0.01 tick
      </p>

      {/* Ad slot preview — appears after auction */}
      {lastAuction != null && (
        <AdSlotPreview
          auction={lastAuction}
          receipt={lastReceipt}
          listing={activeListing}
        />
      )}
    </section>
  );
}
