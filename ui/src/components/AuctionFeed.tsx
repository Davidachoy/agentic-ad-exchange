import type { AuctionResult } from "@ade/shared";

export interface AuctionFeedProps {
  auctions: AuctionResult[];
}

function truncateId(id: string): string {
  return id.slice(0, 8) + "…";
}

export function AuctionFeed({ auctions }: AuctionFeedProps): JSX.Element {
  return (
    <section
      role="region"
      aria-label="Auction feed"
      className="rounded-xl border border-slate-800 bg-exchange-card p-6"
    >
      <h2 className="text-xs uppercase tracking-wide text-slate-400">Auction history</h2>

      {auctions.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No auctions yet — run one to see results.</p>
      ) : (
        <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
          {auctions.map((a) => (
            <li
              key={a.auctionId}
              className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-500">{truncateId(a.auctionId)}</span>
                <span className="font-semibold text-exchange-accent">${a.clearingPriceUsdc}</span>
              </div>
              <div className="mt-1 text-slate-300">
                Winner:{" "}
                <span className="font-semibold">{a.winnerBuyerAgentId}</span>
              </div>
              <div className="mt-0.5 text-slate-500">
                {new Date(a.createdAt).toLocaleTimeString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
