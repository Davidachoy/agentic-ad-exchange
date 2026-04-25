import type { Express } from "express";

import type { CircleClient } from "@ade/wallets";

import type { EventBus } from "../events/bus.js";
import type { NonceStore } from "../nonces/store.js";
import type { BidStore, ListingStore, SettlementStore } from "../state/stores.js";

import type { ResolvedPersona } from "../demo/runAgentAuction.js";

import { createAuctionRouter } from "./auction.js";
import { createBidRouter } from "./bid.js";
import { createDemoRouter } from "./demo.js";
import { createHealthRouter } from "./health.js";
import { createInventoryRouter } from "./inventory.js";
import { createSettlementRouter } from "./settlements.js";
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
  buyerWalletRouting?: ReadonlyMap<string, string>;
  demo?: {
    exchangeUrl: string;
    sellerWallet?: string;
    personas: ResolvedPersona[];
    gemini?: { apiKey: string; model: string };
  };
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
      buyerWalletRouting: deps.buyerWalletRouting,
    }),
  );
  app.use(createSettlementRouter({ settlementStore: deps.settlementStore }));
  app.use(createStreamRouter({ eventBus: deps.eventBus }));
  if (deps.demo) {
    app.use(
      createDemoRouter({
        exchangeUrl: deps.demo.exchangeUrl,
        sellerWallet: deps.demo.sellerWallet,
        personas: deps.demo.personas,
        gemini: deps.demo.gemini,
      }),
    );
  }
}
