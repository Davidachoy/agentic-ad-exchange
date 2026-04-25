export interface TransactionCounterProps {
  count: number;
}

/** ≥ 50 confirmed settlements is the hackathon submission gate. */
const HACKATHON_GATE = 50;

export function TransactionCounter({ count }: TransactionCounterProps): JSX.Element {
  const met = count >= HACKATHON_GATE;
  const subtitleClass = met ? "text-exchange-accent" : "text-slate-400";
  const subtitle = met
    ? `✓ Hackathon target met (≥ ${HACKATHON_GATE} confirmed)`
    : `${count}/${HACKATHON_GATE} confirmed settlements`;

  return (
    <section
      role="status"
      aria-label="Transaction counter"
      className="rounded-xl border border-slate-800 bg-exchange-card p-6"
    >
      <h2 className="text-xs uppercase tracking-wide text-slate-400">On-chain settlements</h2>
      <p className="mt-2 text-5xl font-semibold text-exchange-accent tabular-nums">{count}</p>
      <p className={`mt-2 text-sm ${subtitleClass}`}>{subtitle}</p>
    </section>
  );
}
