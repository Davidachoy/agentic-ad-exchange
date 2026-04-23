export function MarginExplainer(): JSX.Element {
  return (
    <section
      role="region"
      aria-label="Margin explainer"
      className="rounded-xl border border-slate-800 bg-exchange-card p-6"
    >
      <h2 className="text-xs uppercase tracking-wide text-slate-400">Why this model needs Arc</h2>
      <table className="mt-4 w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-1 font-normal">Rail</th>
            <th className="py-1 font-normal">Per-impression cost</th>
            <th className="py-1 font-normal">Gas</th>
            <th className="py-1 font-normal">Works for AI agents?</th>
          </tr>
        </thead>
        <tbody className="text-slate-200">
          <tr className="border-t border-slate-800">
            <td className="py-2">Stripe (fixed fee)</td>
            <td className="py-2">$0.30 + 2.9%</td>
            <td className="py-2">n/a</td>
            <td className="py-2 text-exchange-warn">No</td>
          </tr>
          <tr className="border-t border-slate-800">
            <td className="py-2">ERC-20 on L1/L2</td>
            <td className="py-2">+ $0.01–$10 gas</td>
            <td className="py-2">variable</td>
            <td className="py-2 text-exchange-warn">No</td>
          </tr>
          <tr className="border-t border-slate-800">
            <td className="py-2">Circle Nanopayments on Arc</td>
            <td className="py-2 text-exchange-accent">≤ $0.01</td>
            <td className="py-2 text-exchange-accent">$0.00 per call</td>
            <td className="py-2 text-exchange-accent">Yes</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-4 text-sm text-slate-400">
        Traditional rails carry a ~$0.30 fixed fee floor. Programmatic ad auctions at sub-cent
        clearing prices are uneconomic on every rail except Circle Nanopayments on Arc.
      </p>
    </section>
  );
}
