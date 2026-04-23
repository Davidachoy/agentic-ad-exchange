import { AuctionFeed } from "./components/AuctionFeed.js";
import { MarginExplainer } from "./components/MarginExplainer.js";
import { TransactionCounter } from "./components/TransactionCounter.js";
import { useAuctionStream } from "./hooks/useAuctionStream.js";

export function App(): JSX.Element {
  const { settlementCount, lastAuction, connected } = useAuctionStream();
  return (
    <main className="mx-auto max-w-6xl p-8">
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-slate-100">Agentic Ad Exchange</h1>
        <span
          aria-label="Exchange connection status"
          className={`text-xs uppercase tracking-wide ${
            connected ? "text-exchange-accent" : "text-slate-500"
          }`}
        >
          {connected ? "live" : "connecting"}
        </span>
      </header>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <AuctionFeed lastAuction={lastAuction} />
        <TransactionCounter count={settlementCount} />
        <MarginExplainer />
      </div>
    </main>
  );
}
