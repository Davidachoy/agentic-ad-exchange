import { AdInventoryListingSchema } from "@ade/shared";
import { Router } from "express";

import type { ListingStore } from "../state/stores.js";

export interface InventoryDeps {
  listingStore: ListingStore;
}

export function createInventoryRouter(deps: InventoryDeps): Router {
  const router = Router();
  router.post("/inventory", async (req, res, next) => {
    try {
      const listing = AdInventoryListingSchema.parse(req.body);
      await deps.listingStore.add(listing);
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
