import type { AuctionResult } from "@ade/shared";
import { STREAM_EVENTS } from "@ade/shared";
import { Router } from "express";

import type { EventBus } from "../events/bus.js";

export interface StreamDeps {
  eventBus: EventBus;
  /** Dev-only: emit these `auctionMatched` payloads immediately after `connected`. */
  fixtureAuctionReplay?: ReadonlyArray<AuctionResult>;
}

/**
 * Server-Sent Events endpoint. The UI subscribes via EventSource to drive
 * the live transaction counter and auction feed.
 *
 * Emits a `connected` event immediately so the UI can prove subscription
 * without waiting for the first real auction.
 */
export function createStreamRouter(deps: StreamDeps): Router {
  const router = Router();
  router.get("/events", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    const write = (event: string, data: unknown): void => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    write(STREAM_EVENTS.connected, { at: new Date().toISOString() });

    for (const row of deps.fixtureAuctionReplay ?? []) {
      write(STREAM_EVENTS.auctionMatched, row);
    }

    const offMatched = deps.eventBus.on(STREAM_EVENTS.auctionMatched, (payload) => {
      write(STREAM_EVENTS.auctionMatched, payload);
    });
    const offSettled = deps.eventBus.on(STREAM_EVENTS.settlementConfirmed, (payload) => {
      write(STREAM_EVENTS.settlementConfirmed, payload);
    });
    const offControl = deps.eventBus.on(STREAM_EVENTS.controlChanged, (payload) => {
      write(STREAM_EVENTS.controlChanged, payload);
    });

    req.on("close", () => {
      offMatched();
      offSettled();
      offControl();
      res.end();
    });
  });
  return router;
}
