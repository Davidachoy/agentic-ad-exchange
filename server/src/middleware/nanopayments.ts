import type { RequestHandler } from "express";
import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";

/**
 * Gateway middleware adapter — the single integration seam for Circle Gateway
 * Nanopayments. The interface is stable; only this implementation changes.
 *
 * `require()` returns Express middleware that:
 *   1. Returns HTTP 402 with payment requirements when no X-Payment header.
 *   2. Verifies the EIP-3009 authorization via Circle's facilitator.
 *   3. Settles on-chain and calls next() on success.
 *
 * EIP-3009 nonce uniqueness is enforced by Circle Gateway (server-side).
 * Bid-level nonces (replay protection per buyerWallet) are handled separately
 * in the bid route's NonceStore — those are different concerns.
 */
export interface GatewayMiddlewareAdapter {
  /** Returns an Express middleware that gates a route on a $X.XX USDC payment. */
  require(priceUsd: `$${string}`): RequestHandler;
}

export interface GatewayAdapterConfig {
  /** Seller's EVM address — receives the payment credit on Circle Gateway. */
  sellerAddress: string;
  /**
   * Circle Gateway facilitator URL.
   * Defaults to Arc testnet: "https://gateway-api-testnet.circle.com".
   */
  facilitatorUrl?: string;
}

export function createGatewayAdapter(config: GatewayAdapterConfig): GatewayMiddlewareAdapter {
  const gateway = createGatewayMiddleware({
    sellerAddress: config.sellerAddress,
    // Restrict to Arc testnet only. Buyers must hold a Gateway deposit on this
    // chain. CAIP-2 network ID for Arc testnet (chainId 5042002).
    networks: "eip155:5042002",
    facilitatorUrl: config.facilitatorUrl ?? "https://gateway-api-testnet.circle.com",
    description: "Ad impression bid — Agentic Ad Exchange",
  });

  return {
    require(priceUsd) {
      // Reason: @circle-fin/x402-batching/server types use its own
      // IncomingMessage/ServerResponse subset, not Express's RequestHandler.
      // The shapes are structurally compatible; cast is safe.
      return gateway.require(priceUsd) as unknown as RequestHandler;
    },
  };
}
