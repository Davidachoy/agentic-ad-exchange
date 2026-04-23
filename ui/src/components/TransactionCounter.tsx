export interface TransactionCounterProps {
  count: number;
}

export function TransactionCounter({ count }: TransactionCounterProps): JSX.Element {
  return (
    <section
      role="status"
      aria-label="Transaction counter"
      className="rounded-xl border border-slate-800 bg-exchange-card p-6"
    >
      <h2 className="text-xs uppercase tracking-wide text-slate-400">On-chain settlements</h2>
      <p className="mt-2 text-5xl font-semibold text-exchange-accent tabular-nums">{count}</p>
      <p className="mt-2 text-sm text-slate-400">
        Hackathon target: ≥ 50 confirmed settlements during the demo.
      </p>
    </section>
  );
}
