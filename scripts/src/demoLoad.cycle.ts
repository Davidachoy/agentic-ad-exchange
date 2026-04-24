import { randomBytes, randomUUID } from "node:crypto";

import { runSecondPriceAuction } from "@ade/server";
import {
  BidRequestSchema,
  MAX_CLEARING_PRICE_USDC,
  NANOPAYMENT_UNIT_USDC,
  type BidRequest,
} from "@ade/shared";
import type { CircleClient, TransactionState } from "@ade/wallets";

const USDC_UNITS = 1_000_000n;
const ARC_EXPLORER_BASE = "https://testnet.arcscan.app" as const;

export interface RunDemoCycleDeps {
  circle: CircleClient;
  buyerAgentId?: string;
  buyerWalletId: string;
  buyerAddress: string;
  sellerAddress: string;
  floorUsdc: string;
  /** Injectable RNG; returns `[0, 1)`. Defaults to Math.random. */
  rand?: () => number;
}

export interface DemoCycleResult {
  bidAmount: string;
  clearingPrice: string;
  transactionId: string;
  txHash: string;
  explorerUrl: string;
  state: TransactionState;
}

/**
 * Run one buyer→seller nanopayment cycle: generate a single BidRequest, run
 * the server-side second-price auction engine, settle on-chain via Circle
 * DCW, and return the receipt. Pure orchestration — all price math lives in
 * `@ade/server/auction`, all wallet I/O in `@ade/wallets`.
 */
export async function runDemoCycle(deps: RunDemoCycleDeps): Promise<DemoCycleResult> {
  const rand = deps.rand ?? Math.random;
  const bidAmount = pickBidAmount(deps.floorUsdc, rand);

  const bid: BidRequest = BidRequestSchema.parse({
    bidId: randomUUID(),
    buyerAgentId: deps.buyerAgentId ?? "demo-buyer",
    buyerWallet: deps.buyerAddress,
    targeting: {
      adType: "display",
      format: "banner",
      size: "300x250",
      contextTags: [],
    },
    bidAmountUsdc: bidAmount,
    budgetRemainingUsdc: "1.000000",
    nonce: `0x${randomBytes(32).toString("hex")}`,
    createdAt: new Date().toISOString(),
  });

  const auction = runSecondPriceAuction({ bids: [bid], floorUsdc: deps.floorUsdc });
  if (!auction) {
    throw new Error(
      "runSecondPriceAuction returned null for a single qualifying bid — impossible; check floor config",
    );
  }

  const tx = await deps.circle.transfer({
    walletId: deps.buyerWalletId,
    destinationAddress: deps.sellerAddress,
    amountUsdc: auction.clearingPriceUsdc,
  });
  const receipt = await deps.circle.waitForTx({ transactionId: tx.transactionId });
  const txHash = receipt.txHash ?? "";

  return {
    bidAmount,
    clearingPrice: auction.clearingPriceUsdc,
    transactionId: tx.transactionId,
    txHash,
    explorerUrl: txHash ? `${ARC_EXPLORER_BASE}/tx/${txHash}` : "(no tx hash reported)",
    state: receipt.state,
  };
}

/**
 * Pick a bid in the half-open range `[floor + tick, MAX_CLEARING_PRICE_USDC]`.
 * If `floor + tick` exceeds the cap, clamp to the cap so the bid still
 * passes the floor filter — keeps the demo deterministic near the ceiling.
 */
export function pickBidAmount(floorUsdc: string, rand: () => number): string {
  const minAtomic = addAtomic(toAtomic(floorUsdc), toAtomic(NANOPAYMENT_UNIT_USDC));
  const capAtomic = toAtomic(MAX_CLEARING_PRICE_USDC);
  if (minAtomic >= capAtomic) return fromAtomic(capAtomic);
  const span = capAtomic - minAtomic;
  const roll = BigInt(Math.floor(Math.max(0, Math.min(0.9999999, rand())) * Number(span + 1n)));
  return fromAtomic(minAtomic + roll);
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

function addAtomic(a: bigint, b: bigint): bigint {
  return a + b;
}
