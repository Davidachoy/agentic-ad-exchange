import type { CircleClient } from "@ade/wallets";
import type { Express } from "express";


import type { AutoClearScheduler } from "../auction/autoClearScheduler.js";
import type { ResolvedPersona } from "../demo/runAgentAuction.js";
import type { EventBus } from "../events/bus.js";
import type { GatewayMiddlewareAdapter } from "../middleware/nanopayments.js";
import type { NonceStore } from "../nonces/store.js";
import type { BidStore, ListingStore, SettlementStore } from "../state/stores.js";


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
  /** When present, POST /bid is gated on a sub-cent x402 nanopayment. */
  gateway?: GatewayMiddlewareAdapter;
  buyerWalletRouting?: ReadonlyMap<string, string>;
  demo?: {
    exchangeUrl: string;
    personas: ResolvedPersona[];
    gemini?: { apiKey: string; model: string };
    buyerPrivateKey?: `0x${string}`;
    mode: "in_process" | "external";
  };
  autoClearScheduler: AutoClearScheduler;
}

export function registerRoutes(app: Express, deps: RegisterRoutesDeps): void {
  app.use(createHealthRouter());
  app.use(
    createInventoryRouter({
      listingStore: deps.listingStore,
      autoClearScheduler: deps.autoClearScheduler,
    }),
  );
  app.use(
    createBidRouter({
      bidStore: deps.bidStore,
      nonceStore: deps.nonceStore,
      rateLimitPerMin: deps.rateLimitPerMin,
      gateway: deps.gateway,
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
      autoClearScheduler: deps.autoClearScheduler,
    }),
  );
  app.use(createSettlementRouter({ settlementStore: deps.settlementStore }));
  app.use(createStreamRouter({ eventBus: deps.eventBus }));
  if (deps.demo && deps.demo.mode === "in_process") {
    // Reason: when DEMO_MODE=external, standalone Railway agent services own
    // auction generation. Mounting the demo router here would risk
    // double-bidding (one bid from the in-process orchestrator + one from the
    // external buyer service per persona).
    app.use(
      createDemoRouter({
        exchangeUrl: deps.demo.exchangeUrl,
        listingStore: deps.listingStore,
        personas: deps.demo.personas,
        gemini: deps.demo.gemini,
        buyerPrivateKey: deps.demo.buyerPrivateKey,
      }),
    );
  }
}
