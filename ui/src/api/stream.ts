import { STREAM_EVENTS, type StreamEventName } from "@ade/shared";

/**
 * Tiny typed wrapper around EventSource. Vite proxies /events → :4021.
 */
export interface StreamHandlers {
  onConnected?: () => void;
  onAuctionMatched?: (data: unknown) => void;
  onSettlementConfirmed?: (data: unknown) => void;
  onError?: (err: Event) => void;
}

export function subscribeToEvents(handlers: StreamHandlers): () => void {
  const es = new EventSource("/events");
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
