import type { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";

/**
 * Rate limit keyed by buyer wallet address when present, else by IP.
 * Reason: demo agents share a loopback IP, so wallet-keyed limiting is the
 * correct blast-radius unit (one misbehaving agent shouldn't starve the rest).
 */
export function createBidRateLimiter(perMinute: number): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit: perMinute,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) => {
      const wallet =
        typeof req.body === "object" && req.body !== null
          ? (req.body as Record<string, unknown>).buyerWallet
          : undefined;
      if (typeof wallet === "string" && wallet.length > 0) {
        return `wallet:${wallet.toLowerCase()}`;
      }
      return `ip:${req.ip ?? "unknown"}`;
    },
  });
}
