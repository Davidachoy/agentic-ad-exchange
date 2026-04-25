/**
 * Project-wide numeric and address constants. Zero runtime deps so every
 * package (including ui/) may import safely.
 *
 * USDC amounts are encoded as decimal strings (6-decimal precision) to avoid
 * the float imprecision that would mis-settle at sub-cent scale.
 */

/** Auction tick: the "$0.01 above second highest" rule from the product spec. */
export const NANOPAYMENT_UNIT_USDC = "0.01" as const;

/** Minimum allowed floor price a seller may list. */
export const FLOOR_PRICE_MIN_USDC = "0.001" as const;

/** Hard ceiling on any computed clearing price — enforces the ≤ $0.01/action hackathon rule. */
export const MAX_CLEARING_PRICE_USDC = "0.01" as const;

/** LangGraph recursion cap (from autonomous-wallet-agent-tutorial § The Agent Loop). */
export const MAX_AGENT_ITERATIONS = 5 as const;

/**
 * Circle Gateway Wallet contract — identical on every EVM testnet (per PLANNING.md § Settlement Layer).
 * Buyers deposit USDC into this contract; EIP-3009 authorizations debit its per-depositor internal ledger.
 */
export const GATEWAY_WALLET_ADDRESS = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9" as const;

/**
 * Arc testnet chain ID — the numeric EVM identifier used in EIP-712 typed-data
 * domains (EIP-3009 TransferWithAuthorization). Verified from
 * https://docs.arc.network/arc/references/network-information on 2026-04-24.
 * CAIP-2 equivalent: `eip155:5042002` (see X402_NETWORK in .env.example).
 * Mainnet chain ID differs; do not reuse for a mainnet cutover.
 */
export const ARC_TESTNET_CHAIN_ID = 5042002 as const;

/**
 * Arc testnet USDC contract address — the ERC-20 precompile that wraps the
 * native USDC gas token on Arc. Verified from
 * https://docs.arc.network/arc/references/contract-addresses on 2026-04-24.
 * Mainnet address differs; do not reuse for mainnet-cutover.md.
 */
export const ARC_TESTNET_USDC = "0x3600000000000000000000000000000000000000" as const;

/** SSE event names the server emits; the UI subscribes by name. */
export const STREAM_EVENTS = {
  connected: "connected",
  auctionMatched: "auction.matched",
  settlementConfirmed: "settlement.confirmed",
} as const;

export type StreamEventName = (typeof STREAM_EVENTS)[keyof typeof STREAM_EVENTS];
