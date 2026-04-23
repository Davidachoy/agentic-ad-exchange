import type { Express } from "express";

import type { EventBus } from "../events/bus.js";
import type { NonceStore } from "../nonces/store.js";
import type { BidStore, ListingStore } from "../state/stores.js";

import { createBidRouter } from "./bid.js";
import { createHealthRouter } from "./health.js";
import { createInventoryRouter } from "./inventory.js";
import { createStreamRouter } from "./stream.js";

export interface RegisterRoutesDeps {
  listingStore: ListingStore;
  bidStore: BidStore;
  nonceStore: NonceStore;
  eventBus: EventBus;
  rateLimitPerMin: number;
}

export function registerRoutes(app: Express, deps: RegisterRoutesDeps): void {
  app.use(createHealthRouter());
  app.use(createInventoryRouter({ listingStore: deps.listingStore }));
  app.use(
    createBidRouter({
      bidStore: deps.bidStore,
      nonceStore: deps.nonceStore,
      rateLimitPerMin: deps.rateLimitPerMin,
    }),
  );
  app.use(createStreamRouter({ eventBus: deps.eventBus }));
}
