/**
 * Re-export USDC decimal-string ⇄ BigInt helpers from `@ade/shared`.
 *
 * Reason: the canonical implementation now lives in `@ade/shared` so agent-side
 * tools can do floor / clearing-price comparisons without depending on the
 * server package. This file stays as a thin re-export so existing server
 * imports (`../auction/money.js`) keep compiling.
 */
export { addUsdc, fromAtomic, gtUsdc, gteUsdc, minUsdc, toAtomic } from "@ade/shared";
