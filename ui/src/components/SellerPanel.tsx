import type { AdInventoryListing } from "@ade/shared";

export interface SellerPanelProps {
  listings: AdInventoryListing[];
  onRegister: () => Promise<void>;
  registering: boolean;
}

export function SellerPanel({ listings, onRegister, registering }: SellerPanelProps): JSX.Element {
  return (
    <section
      role="region"
      aria-label="Seller agent panel"
      className="flex flex-col rounded-xl border border-slate-800 bg-exchange-card p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Seller Agent</h2>
          <p className="text-xs text-slate-400">sigma · ad inventory</p>
        </div>
        <span className="rounded-full bg-purple-900/40 px-2 py-0.5 text-xs text-purple-300">
          Step 1
        </span>
      </div>

      <div className="mt-4 flex-1 space-y-2">
        {listings.length === 0 ? (
          <p className="text-sm text-slate-500">No ad slots registered yet.</p>
        ) : (
          listings.map((l) => (
            <div
              key={l.listingId}
              className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">
                  {l.format} · {l.size}
                </span>
                <span className="rounded bg-slate-700 px-1.5 py-0.5 uppercase text-slate-300">
                  {l.adType}
                </span>
              </div>
              <div className="mt-1 text-slate-400">
                Floor:{" "}
                <span className="font-semibold text-exchange-accent">${l.floorPriceUsdc} USDC</span>
              </div>
              <div className="mt-0.5 font-mono text-slate-500">#{l.listingId.slice(0, 8)}</div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => void onRegister()}
        disabled={registering}
        className="mt-4 w-full rounded-lg border border-purple-700/50 bg-purple-900/20 px-4 py-2.5 text-sm font-medium text-purple-300 transition-colors hover:bg-purple-900/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {registering ? "Registering…" : "+ Register Demo Ad Slot"}
      </button>

      <p className="mt-2 text-center text-xs text-slate-500">
        300×250 banner · floor $0.002 USDC
      </p>
    </section>
  );
}
