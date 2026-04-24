import { EventEmitter } from "node:events";

import type { AuctionResult, SettlementReceipt, StreamEventName, STREAM_EVENTS } from "@ade/shared";

export interface EventPayloads {
  [STREAM_EVENTS.auctionMatched]: AuctionResult;
  [STREAM_EVENTS.settlementConfirmed]: SettlementReceipt;
  [STREAM_EVENTS.connected]: { at: string };
}

/**
 * Thin typed wrapper around node:events — one instance per process, shared
 * by the SSE route and any feature PRP that wants to publish auction/settlement
 * events.
 */
export interface EventBus {
  emit<K extends StreamEventName>(event: K, payload: EventPayloads[K]): void;
  on<K extends StreamEventName>(event: K, handler: (payload: EventPayloads[K]) => void): () => void;
}

export function createEventBus(): EventBus {
  const ee = new EventEmitter();
  return {
    emit(event, payload) {
      ee.emit(event, payload);
    },
    on(event, handler) {
      ee.on(event, handler as (...args: unknown[]) => void);
      return () => ee.off(event, handler as (...args: unknown[]) => void);
    },
  };
}
