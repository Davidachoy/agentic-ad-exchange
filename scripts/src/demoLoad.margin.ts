const USDC_UNITS = 1_000_000n;

/**
 * Canonical Stripe fixed-fee equivalent per transaction (2.9% + $0.30). At
 * sub-cent clearing prices the 2.9% vanishes in rounding; the $0.30 fixed
 * fee is what makes the traditional-rails story uneconomic.
 */
const STRIPE_FIXED_FEE_USD = "0.30" as const;

/**
 * Rough Ethereum L1 gas equivalent for a USDC ERC-20 transfer. Anchored to
 * public long-run averages for the *story*, not live-quoted — the banner is
 * a demo artifact, not a pricing API.
 */
const ETH_L1_GAS_PER_TRANSFER_USD = "2.50" as const;

export interface BuildMarginExplainerOpts {
  cycles: number;
  /** Sum of clearing prices already settled, as a 6-decimal USDC string. */
  totalUsdcSettled: string;
}

/**
 * Produce the margin-explainer banner lines shown at the end of demo:load.
 * Pure function: given `cycles` and total USDC settled, return deterministic
 * banner lines so the margin story is reproducible across demo runs.
 */
export function buildMarginExplainer(opts: BuildMarginExplainerOpts): string[] {
  if (opts.cycles < 0) {
    throw new Error(`cycles must be ≥ 0, got ${opts.cycles}`);
  }
  if (opts.cycles === 0) {
    return [
      "0 cycles executed — skipping margin comparison.",
      "Re-run with a higher DEMO_LOAD_CYCLES (min 50) to produce the explainer.",
    ];
  }
  const totalSettledAtomic = toAtomic(opts.totalUsdcSettled);
  const stripeEquivalentAtomic = toAtomic(STRIPE_FIXED_FEE_USD) * BigInt(opts.cycles);
  const ethL1EquivalentAtomic = toAtomic(ETH_L1_GAS_PER_TRANSFER_USD) * BigInt(opts.cycles);

  return [
    "Margin explainer — why this is uneconomic on traditional rails",
    "",
    `  Cycles settled: ${opts.cycles}`,
    `  USDC moved via Circle Nanopayments: $${fromAtomic(totalSettledAtomic)}`,
    "",
    `  Stripe-equivalent fixed fees (${opts.cycles} × $${STRIPE_FIXED_FEE_USD}): $${fromAtomic(stripeEquivalentAtomic)}`,
    `  Ethereum L1 gas (${opts.cycles} × $${ETH_L1_GAS_PER_TRANSFER_USD} est.): $${fromAtomic(ethL1EquivalentAtomic)}`,
    "",
    "  Circle Nanopayments: sub-cent per action, gas-free to the buyer, batched on Arc.",
  ];
}

function toAtomic(usdc: string): bigint {
  const [whole = "0", frac = ""] = usdc.split(".");
  const padded = (frac + "000000").slice(0, 6);
  return BigInt(whole) * USDC_UNITS + BigInt(padded);
}

function fromAtomic(atomic: bigint): string {
  const whole = atomic / USDC_UNITS;
  const frac = atomic % USDC_UNITS;
  return `${whole.toString()}.${frac.toString().padStart(6, "0")}`;
}
