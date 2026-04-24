import type { RequestHandler } from "express";

/**
 * Gateway middleware adapter — the single integration seam for Circle Gateway
 * Nanopayments. Feature PRPs wire the real `createGatewayMiddleware` from
 * `@circle-fin/x402-batching` behind this interface; nothing else in the
 * server needs to know the SDK shape.
 *
 * At scaffold time `require()` returns a 503 so any route that tries to gate
 * itself via Gateway fails loud — we do NOT silently pretend payments cleared.
 *
 * TODO(post-scaffold): wire @circle-fin/x402-batching — see
 * tutorials/pay-per-call-llm-nanopayments-tutorial.md § Seller Side.
 */
export interface GatewayMiddlewareAdapter {
  /** Returns an Express middleware that gates a route on a $X.XX USDC payment. */
  require(priceUsd: `$${string}`): RequestHandler;
}

export function createGatewayAdapter(): GatewayMiddlewareAdapter {
  return {
    require(priceUsd) {
      // Scaffold: always 503 so callers can still register the route but can't
      // accidentally ship an unprotected "paid" endpoint.
      return (_req, res, _next) => {
        res.status(503).json({
          error: "gateway_not_wired",
          priceUsd,
          message:
            "Circle Gateway middleware is a scaffold stub. Wire @circle-fin/x402-batching in server/src/middleware/nanopayments.ts.",
        });
      };
    },
  };
}
