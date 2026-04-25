import { ARC_TESTNET_EXPLORER_BASE, type SettlementReceipt } from "@ade/shared";

export interface SettlementLedgerProps {
  receipts: SettlementReceipt[];
  sellerAddress?: string;
}

function truncateTxHash(hash: string): string {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export function SettlementLedger({ receipts, sellerAddress }: SettlementLedgerProps): JSX.Element {
  // Reason: useAuctionStream already filters, but a missing arcTxHash on a
  // "confirmed" receipt would render a broken /tx/ link — defend in depth.
  const rows = receipts.filter(
    (r): r is SettlementReceipt & { arcTxHash: string } =>
      r.status === "confirmed" && typeof r.arcTxHash === "string" && r.arcTxHash.length > 0,
  );

  return (
    <section
      role="region"
      aria-label="Settlement ledger"
      className="rounded-xl border border-slate-800 bg-exchange-card p-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs uppercase tracking-wide text-slate-400">Settlement ledger</h2>
        {sellerAddress && (
          <a
            href={`${ARC_TESTNET_EXPLORER_BASE}/address/${sellerAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-exchange-accent hover:underline"
          >
            View all on Arcscan ↗
          </a>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No settlements yet — run the demo to see explorer-verified tx.
        </p>
      ) : (
        <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
          {rows.map((r) => (
            <li
              key={r.receiptId}
              className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <a
                  href={`${ARC_TESTNET_EXPLORER_BASE}/tx/${r.arcTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-slate-300 hover:text-exchange-accent hover:underline"
                >
                  {truncateTxHash(r.arcTxHash)}
                </a>
                <span className="font-semibold text-exchange-accent">
                  ${Number(r.amountUsdc).toFixed(6)}
                </span>
              </div>
              <div className="mt-0.5 text-slate-500">
                {new Date(r.confirmedAt ?? r.createdAt).toLocaleTimeString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
