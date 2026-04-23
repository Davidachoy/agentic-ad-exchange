import type { BidRequest } from "@ade/shared";
import { MAX_CLEARING_PRICE_USDC, NANOPAYMENT_UNIT_USDC } from "@ade/shared";

import { filterBidsAboveFloor } from "./floor.js";
import { addUsdc, fromAtomic, gtUsdc, minUsdc, toAtomic } from "./money.js";

export interface AuctionInput {
  bids: readonly BidRequest[];
  floorUsdc: string;
}

export interface AuctionOutput {
  winner: BidRequest;
  /** Second-price + 1 tick, capped at the winner's bid and at MAX_CLEARING_PRICE_USDC. */
  clearingPriceUsdc: string;
  /** Bids that cleared the floor, sorted descending by bid amount, ties by earliest createdAt. */
  rankedBids: BidRequest[];
}

/**
 * Second-price sealed-bid auction with a configurable tick.
 *
 * Rules (from agentic-ad-exchange-stack.md § The Exchange + PRP blueprint):
 *   1. Drop bids below `floorUsdc`.
 *   2. 0 bids  → null.
 *   3. 1 bid   → winner pays `floor + NANOPAYMENT_UNIT_USDC`.
 *   4. ≥ 2     → sort desc by bid; ties broken by earliest `createdAt`.
 *                clearing = min(winner.bid, secondHighest.bid + tick).
 *   5. Always cap clearing at MAX_CLEARING_PRICE_USDC — hackathon invariant.
 *
 * All math goes through the BigInt helpers in `./money.ts`. No floats.
 */
export function runSecondPriceAuction(input: AuctionInput): AuctionOutput | null {
  const eligible = filterBidsAboveFloor(input.bids, input.floorUsdc);
  if (eligible.length === 0) return null;

  const ranked = [...eligible].sort(compareBidsDesc);
  const [winner, second] = ranked;
  if (!winner) return null;

  const baseClearing =
    second === undefined
      ? addUsdc(input.floorUsdc, NANOPAYMENT_UNIT_USDC)
      : addUsdc(second.bidAmountUsdc, NANOPAYMENT_UNIT_USDC);

  let clearing = minUsdc(baseClearing, winner.bidAmountUsdc);
  // Hackathon cap: clearing price must never exceed $0.01.
  if (gtUsdc(clearing, MAX_CLEARING_PRICE_USDC)) {
    // Reason: normalize to 6-decimal string form so all outputs are consistent.
    clearing = fromAtomic(toAtomic(MAX_CLEARING_PRICE_USDC));
  }

  return {
    winner,
    clearingPriceUsdc: clearing,
    rankedBids: ranked,
  };
}

function compareBidsDesc(a: BidRequest, b: BidRequest): number {
  const diff = toAtomic(b.bidAmountUsdc) - toAtomic(a.bidAmountUsdc);
  if (diff !== 0n) return diff > 0n ? 1 : -1;
  // Tie-break: earliest createdAt wins.
  const ta = Date.parse(a.createdAt);
  const tb = Date.parse(b.createdAt);
  if (ta !== tb) return ta - tb;
  // Stable final tie-break so output is deterministic.
  return a.bidId.localeCompare(b.bidId);
}
