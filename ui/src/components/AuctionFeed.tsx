export interface AuctionFeedProps {
  lastAuction: unknown;
}

export function AuctionFeed({ lastAuction }: AuctionFeedProps): JSX.Element {
  return (
    <section
      role="region"
      aria-label="Auction feed"
      className="rounded-xl border border-slate-800 bg-exchange-card p-6"
    >
      <h2 className="text-xs uppercase tracking-wide text-slate-400">Live auction feed</h2>
      {lastAuction ? (
        <pre className="mt-2 overflow-auto text-xs text-slate-300">
          {JSON.stringify(lastAuction, null, 2)}
        </pre>
      ) : (
        <p className="mt-2 text-sm text-slate-400">
          No auctions yet. Waiting for buyer/seller agents…
        </p>
      )}
    </section>
  );
}
