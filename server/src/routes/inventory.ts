import { AdInventoryListingSchema } from "@ade/shared";
import { Router } from "express";

import type { AutoClearScheduler } from "../auction/autoClearScheduler.js";
import { createPauseGuard } from "../middleware/pauseGuard.js";
import type { ControlStore } from "../state/controlStore.js";
import type { ListingStore } from "../state/stores.js";

export interface InventoryDeps {
  listingStore: ListingStore;
  autoClearScheduler: AutoClearScheduler;
  controlStore: ControlStore;
}

export function createInventoryRouter(deps: InventoryDeps): Router {
  const router = Router();
  router.post("/inventory", createPauseGuard(deps.controlStore), async (req, res, next) => {
    try {
      const listing = AdInventoryListingSchema.parse(req.body);
      await deps.listingStore.add(listing);
      // Reason: kicks the per-listing auto-clear timer. No-op when
      // AUCTION_AUTO_CLEAR_DELAY_MS=0 (auto-clear disabled).
      deps.autoClearScheduler.schedule(listing.listingId);
      res.status(201).json({ listingId: listing.listingId });
    } catch (err) {
      next(err);
    }
  });
  router.get("/inventory", async (_req, res, next) => {
    try {
      const items = await deps.listingStore.list();
      res.json({ items });
    } catch (err) {
      next(err);
    }
  });
  return router;
}
