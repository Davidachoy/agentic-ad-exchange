import { BidRequestSchema } from "@ade/shared";
import { Router } from "express";

import { createBidRateLimiter } from "../middleware/rateLimit.js";
import type { NonceStore } from "../nonces/store.js";
import type { BidStore } from "../state/stores.js";

export interface BidDeps {
  bidStore: BidStore;
  nonceStore: NonceStore;
  rateLimitPerMin: number;
}

export function createBidRouter(deps: BidDeps): Router {
  const router = Router();

  router.get("/bids", async (_req, res, next) => {
    try {
      const items = await deps.bidStore.list();
      res.json({ items });
    } catch (err) {
      next(err);
    }
  });

  router.post("/bid", createBidRateLimiter(deps.rateLimitPerMin), async (req, res, next) => {
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
  });
  return router;
}
