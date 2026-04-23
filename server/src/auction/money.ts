/**
 * USDC decimal-string ⇄ 6-decimal BigInt conversion.
 *
 * Reason: floats silently mis-round at sub-cent scale. All auction math,
 * floor comparisons, and clearing-price computation go through this helper.
 * Inputs from HTTP boundaries are already validated as `/^\d+(\.\d{1,6})?$/`
 * by zod — we trust that shape here.
 */
const UNITS_PER_USDC = 1_000_000n;

export function toAtomic(usdc: string): bigint {
  const [whole = "0", frac = ""] = usdc.split(".");
  const padded = (frac + "000000").slice(0, 6);
  return BigInt(whole) * UNITS_PER_USDC + BigInt(padded);
}

export function fromAtomic(atomic: bigint): string {
  const whole = atomic / UNITS_PER_USDC;
  const frac = atomic % UNITS_PER_USDC;
  return `${whole.toString()}.${frac.toString().padStart(6, "0")}`;
}

export function addUsdc(a: string, b: string): string {
  return fromAtomic(toAtomic(a) + toAtomic(b));
}

export function minUsdc(a: string, b: string): string {
  return toAtomic(a) <= toAtomic(b) ? normalize(a) : normalize(b);
}

export function gtUsdc(a: string, b: string): boolean {
  return toAtomic(a) > toAtomic(b);
}

export function gteUsdc(a: string, b: string): boolean {
  return toAtomic(a) >= toAtomic(b);
}

function normalize(usdc: string): string {
  return fromAtomic(toAtomic(usdc));
}
