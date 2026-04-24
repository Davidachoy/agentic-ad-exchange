import type { Express } from "express";

import type { CircleClient } from "@ade/wallets";

import type { EventBus } from "../events/bus.js";
import type { NonceStore } from "../nonces/store.js";
import type { BidStore, ListingStore, SettlementStore } from "../state/stores.js";

import { createAuctionRouter } from "./auction.js";
import { createBidRouter } from "./bid.js";
import { createHealthRouter } from "./health.js";
import { createInventoryRouter } from "./inventory.js";
import { createStreamRouter } from "./stream.js";

export interface RegisterRoutesDeps {
  listingStore: ListingStore;
  bidStore: BidStore;
  settlementStore: SettlementStore;
  nonceStore: NonceStore;
  eventBus: EventBus;
  rateLimitPerMin: number;
  circleClient: CircleClient | null;
  buyerWalletId: string | undefined;
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
  app.use(
    createAuctionRouter({
      listingStore: deps.listingStore,
      bidStore: deps.bidStore,
      settlementStore: deps.settlementStore,
      eventBus: deps.eventBus,
      circleClient: deps.circleClient,
      buyerWalletId: deps.buyerWalletId,
    }),
  );
  app.use(createStreamRouter({ eventBus: deps.eventBus }));
}
