import { randomBytes, randomUUID } from "node:crypto";

import { BidRequestSchema, MAX_CLEARING_PRICE_USDC, NANOPAYMENT_UNIT_USDC } from "@ade/shared";

const USDC_UNITS = 1_000_000n;
const ARC_EXPLORER_BASE = "https://testnet.arcscan.app" as const;

export interface RunDemoCycleDeps {
  exchangeApiUrl: string;
  listingId: string;
  buyerAgentId?: string;
  buyerAddress: string;
  floorUsdc: string;
  /** Injectable RNG; returns `[0, 1)`. Defaults to Math.random. */
  rand?: () => number;
}

export interface DemoCycleResult {
  bidAmount: string;
  clearingPrice: string;
  auctionId: string;
  txHash: string;
  explorerUrl: string;
  status: string;
}

/**
 * Run one buyer→seller nanopayment cycle via the Exchange HTTP API.
 * POSTs a bid, then triggers the server-side second-price auction which
 * handles settlement and emits SSE events for the live dashboard.
 */
export async function runDemoCycle(deps: RunDemoCycleDeps): Promise<DemoCycleResult> {
  const rand = deps.rand ?? Math.random;
  const bidAmount = pickBidAmount(deps.floorUsdc, rand);

  const bid = BidRequestSchema.parse({
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

  const bidRes = await fetch(`${deps.exchangeApiUrl}/bid`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bid),
  });
  if (!bidRes.ok) {
    const body = await bidRes.json().catch(() => null);
    throw new Error(`POST /bid failed: ${bidRes.status} ${JSON.stringify(body)}`);
  }

  const auctionRes = await fetch(
    `${deps.exchangeApiUrl}/auction/run/${deps.listingId}`,
    { method: "POST", headers: { "Content-Type": "application/json" } },
  );
  if (!auctionRes.ok) {
    const body = await auctionRes.json().catch(() => null);
    throw new Error(
      `POST /auction/run/${deps.listingId} failed: ${auctionRes.status} ${JSON.stringify(body)}`,
    );
  }

  const { auctionResult, receipt } = (await auctionRes.json()) as {
    auctionResult: { auctionId: string; clearingPriceUsdc: string };
    receipt: { status: string; arcTxHash?: string };
  };

  const txHash = receipt.arcTxHash ?? "";
  return {
    bidAmount,
    clearingPrice: auctionResult.clearingPriceUsdc,
    auctionId: auctionResult.auctionId,
    txHash,
    explorerUrl: txHash ? `${ARC_EXPLORER_BASE}/tx/${txHash}` : "(no tx hash reported)",
    status: receipt.status,
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
