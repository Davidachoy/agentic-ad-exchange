import { Router } from "express";

import type { AutoClearScheduler } from "../auction/autoClearScheduler.js";
import { runAuction, type RunAuctionDeps } from "../auction/runAuction.js";
import { createPauseGuard } from "../middleware/pauseGuard.js";
import { createAuctionRateLimiter } from "../middleware/rateLimit.js";
import type { ControlStore } from "../state/controlStore.js";

export interface AuctionRunDeps extends RunAuctionDeps {
  autoClearScheduler: AutoClearScheduler;
  controlStore: ControlStore;
}

export function createAuctionRouter(deps: AuctionRunDeps): Router {
  const router = Router();

  router.post(
    "/auction/run/:listingId",
    createPauseGuard(deps.controlStore),
    createAuctionRateLimiter(5),
    async (req, res, next) => {
      try {
        const { listingId } = req.params as { listingId: string };
        // Reason: cancel a pending auto-clear timer first so the manual
        // run "wins" cleanly. cancel() is a no-op when no timer is pending.
        deps.autoClearScheduler.cancel(listingId);
        const outcome = await runAuction(listingId, deps);
        switch (outcome.kind) {
          case "listing_not_found":
            res.status(404).json({ error: "listing_not_found" });
            return;
          case "no_eligible_bids":
            res.status(409).json({ error: "no_eligible_bids" });
            return;
          case "settled":
            res.status(200).json({
              auctionResult: outcome.auctionResult,
              receipt: outcome.receipt,
            });
            return;
        }
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
