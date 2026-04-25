import { BidRequestSchema } from "@ade/shared";
import { Router, type RequestHandler } from "express";

import { createBidRateLimiter } from "../middleware/rateLimit.js";
import type { GatewayMiddlewareAdapter } from "../middleware/nanopayments.js";
import type { NonceStore } from "../nonces/store.js";
import type { BidStore } from "../state/stores.js";

export interface BidDeps {
  bidStore: BidStore;
  nonceStore: NonceStore;
  rateLimitPerMin: number;
  /** When present, POST /bid requires a sub-cent x402 nanopayment. */
  gateway?: GatewayMiddlewareAdapter;
}

const passThrough: RequestHandler = (_req, _res, next) => next();

export function createBidRouter(deps: BidDeps): Router {
  const router = Router();
  const paymentGate = deps.gateway?.require("$0.001") ?? passThrough;

  router.post(
    "/bid",
    createBidRateLimiter(deps.rateLimitPerMin),
    paymentGate,
    async (req, res, next) => {
      try {
        const bid = BidRequestSchema.parse(req.body);
        const claimed = await deps.nonceStore.claim(bid.buyerWallet, bid.nonce);
        if (!claimed) {
          res.status(409).json({ error: "nonce_reused" });
          return;
        }
        await deps.bidStore.add(bid);
        res.status(202).json({ bidId: bid.bidId });
      } catch (err) {
        next(err);
      }
    },
  );
  return router;
}
