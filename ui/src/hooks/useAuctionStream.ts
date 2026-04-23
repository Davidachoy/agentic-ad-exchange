import { useEffect, useState } from "react";

import { subscribeToEvents } from "../api/stream.js";

export interface AuctionStreamState {
  connected: boolean;
  settlementCount: number;
  lastAuction: unknown;
}

export function useAuctionStream(): AuctionStreamState {
  const [state, setState] = useState<AuctionStreamState>({
    connected: false,
    settlementCount: 0,
    lastAuction: null,
  });

  useEffect(() => {
    const off = subscribeToEvents({
      onConnected: () => setState((s) => ({ ...s, connected: true })),
      onAuctionMatched: (data) => setState((s) => ({ ...s, lastAuction: data })),
      onSettlementConfirmed: () =>
        setState((s) => ({ ...s, settlementCount: s.settlementCount + 1 })),
    });
    return off;
  }, []);

  return state;
}
