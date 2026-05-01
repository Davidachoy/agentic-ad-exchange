import { STREAM_EVENTS, type StreamEventName } from "@ade/shared";

import { uiEnv } from "../env.js";

/**
 * Tiny typed wrapper around EventSource. In dev, Vite proxies /api/events → :4021/events.
 * In prod, VITE_API_BASE_URL is the absolute server origin.
 */
export interface StreamHandlers {
  onConnected?: () => void;
  onAuctionMatched?: (data: unknown) => void;
  onSettlementConfirmed?: (data: unknown) => void;
  onError?: (err: Event) => void;
}

export function subscribeToEvents(handlers: StreamHandlers): () => void {
  const es = new EventSource(`${uiEnv.VITE_API_BASE_URL}/events`);
  const parse = (e: MessageEvent): unknown => {
    try {
      return JSON.parse(e.data as string);
    } catch {
      return null;
    }
  };
  const map: Record<StreamEventName, ((e: MessageEvent) => void) | undefined> = {
    [STREAM_EVENTS.connected]: () => handlers.onConnected?.(),
    [STREAM_EVENTS.auctionMatched]: (e) => handlers.onAuctionMatched?.(parse(e)),
    [STREAM_EVENTS.settlementConfirmed]: (e) => handlers.onSettlementConfirmed?.(parse(e)),
  };
  for (const [name, fn] of Object.entries(map)) {
    if (fn) es.addEventListener(name, fn as EventListener);
  }
  es.onerror = (e) => handlers.onError?.(e);
  return () => es.close();
}
