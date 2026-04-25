import { useEffect, useState } from "react";

import {
  AuctionResultSchema,
  SettlementReceiptSchema,
  type AuctionResult,
  type SettlementReceipt,
} from "@ade/shared";

import { subscribeToEvents } from "../api/stream.js";

export interface AuctionStreamState {
  connected: boolean;
  settlementCount: number;
  auctions: AuctionResult[];
  lastAuction: AuctionResult | null;
  lastReceipt: SettlementReceipt | null;
}

const MAX_HISTORY = 10;

export function useAuctionStream(): AuctionStreamState {
  const [state, setState] = useState<AuctionStreamState>({
    connected: false,
    settlementCount: 0,
    auctions: [],
    lastAuction: null,
    lastReceipt: null,
  });

  useEffect(() => {
    const off = subscribeToEvents({
      onConnected: () => setState((s) => ({ ...s, connected: true })),
      onAuctionMatched: (data) => {
        const parsed = AuctionResultSchema.safeParse(data);
        if (!parsed.success) return;
        setState((s) => ({
          ...s,
          lastAuction: parsed.data,
          auctions: [parsed.data, ...s.auctions].slice(0, MAX_HISTORY),
          // Reason: a new auction has matched; any prior receipt belongs to a
          // previous auctionId. Drop it so the UI shows "pending" until the
          // settlement.confirmed for THIS auction arrives.
          lastReceipt:
            s.lastReceipt && s.lastReceipt.auctionId === parsed.data.auctionId
              ? s.lastReceipt
              : null,
        }));
      },
      onSettlementConfirmed: (data) => {
        const parsed = SettlementReceiptSchema.safeParse(data);
        if (!parsed.success) return;
        setState((s) => ({
          ...s,
          settlementCount: s.settlementCount + 1,
          lastReceipt: parsed.data,
        }));
      },
    });
    return off;
  }, []);

  return state;
}
