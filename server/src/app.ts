import express, { type Express } from "express";

import type { CircleClient } from "@ade/wallets";

import { createEventBus, type EventBus } from "./events/bus.js";
import { createCorsMiddleware } from "./middleware/corsAllowList.js";
import { errorHandler } from "./middleware/errorHandler.js";
import type { GatewayMiddlewareAdapter } from "./middleware/nanopayments.js";
import { createInMemoryNonceStore, type NonceStore } from "./nonces/store.js";
import { registerRoutes } from "./routes/index.js";
import {
  createBidStore,
  createListingStore,
  createSettlementStore,
  type BidStore,
  type ListingStore,
  type SettlementStore,
} from "./state/stores.js";

export interface AppDeps {
  corsAllowOrigins: readonly string[];
  bidRateLimitPerMin: number;
  listingStore?: ListingStore;
  bidStore?: BidStore;
  settlementStore?: SettlementStore;
  nonceStore?: NonceStore;
  eventBus?: EventBus;
  /** Injected in production; null in tests that don't exercise settlement. */
  circleClient?: CircleClient | null;
  buyerWalletId?: string;
  /** When present, POST /bid is gated on a sub-cent x402 nanopayment. */
  gateway?: GatewayMiddlewareAdapter;
  /**
   * Optional address-keyed Circle wallet id map. When the winning bid's
   * `buyerWallet` matches a key here, settlement uses that wallet; otherwise
   * the route falls back to `buyerWalletId`.
   */
  buyerWalletRouting?: ReadonlyMap<string, string>;
  /**
   * Optional self-contained agent-demo dependencies. When set, the server
   * exposes POST /demo/agent-run which orchestrates a full Gemini-driven
   * cycle (seller registers → buyers bid → auction clears).
   */
  demo?: {
    exchangeUrl: string;
    sellerWallet?: string;
    personas: import("./demo/runAgentAuction.js").ResolvedPersona[];
    gemini?: { apiKey: string; model: string };
  };
}

export interface AppHandles {
  app: Express;
  listingStore: ListingStore;
  bidStore: BidStore;
  settlementStore: SettlementStore;
  nonceStore: NonceStore;
  eventBus: EventBus;
}

/**
 * Pure Express app factory. No listen(); no process.env reads. Dependency
 * injection points let tests swap each store for a fresh in-memory instance.
 */
export function createApp(deps: AppDeps): AppHandles {
  const app = express();
  const listingStore = deps.listingStore ?? createListingStore();
  const bidStore = deps.bidStore ?? createBidStore();
  const settlementStore = deps.settlementStore ?? createSettlementStore();
  const nonceStore = deps.nonceStore ?? createInMemoryNonceStore();
  const eventBus = deps.eventBus ?? createEventBus();

  app.disable("x-powered-by");
  app.use(createCorsMiddleware(deps.corsAllowOrigins));
  app.use(express.json({ limit: "64kb" }));

  registerRoutes(app, {
    listingStore,
    bidStore,
    settlementStore,
    nonceStore,
    eventBus,
    rateLimitPerMin: deps.bidRateLimitPerMin,
    circleClient: deps.circleClient ?? null,
    buyerWalletId: deps.buyerWalletId,
    gateway: deps.gateway,
    buyerWalletRouting: deps.buyerWalletRouting,
    demo: deps.demo,
  });

  app.use(errorHandler);

  return { app, listingStore, bidStore, settlementStore, nonceStore, eventBus };
}
