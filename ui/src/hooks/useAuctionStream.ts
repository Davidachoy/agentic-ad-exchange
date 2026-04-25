import {
  AuctionResultSchema,
  SettlementReceiptSchema,
  type AuctionResult,
  type SettlementReceipt,
} from "@ade/shared";
import { useEffect, useState } from "react";

import { getSettlements } from "../api/client.js";
import { subscribeToEvents } from "../api/stream.js";

export interface AuctionStreamState {
  connected: boolean;
  settlementCount: number;
  auctions: AuctionResult[];
  lastAuction: AuctionResult | null;
  lastReceipt: SettlementReceipt | null;
  confirmedReceipts: SettlementReceipt[];
}

const MAX_HISTORY = 10;
/** One buffer above the ≥ 50 hackathon gate so a judge can scroll past 50 rows. */
export const MAX_LEDGER_HISTORY = 60;

/**
 * De-duplicate two receipt arrays by `receiptId`, preserving order: items
 * earlier in `incoming` win over later duplicates from `existing`.
 */
function mergeDedupe(
  incoming: SettlementReceipt[],
  existing: SettlementReceipt[],
): SettlementReceipt[] {
  const seen = new Set<string>();
  const out: SettlementReceipt[] = [];
  for (const r of [...incoming, ...existing]) {
    if (seen.has(r.receiptId)) continue;
    seen.add(r.receiptId);
    out.push(r);
  }
  return out;
}

export function useAuctionStream(): AuctionStreamState {
  const [state, setState] = useState<AuctionStreamState>({
    connected: false,
    settlementCount: 0,
    auctions: [],
    lastAuction: null,
    lastReceipt: null,
    confirmedReceipts: [],
  });

  useEffect(() => {
    let cancelled = false;

    // Backfill the ledger on mount so a mid-demo refresh shows the running tally
    // instead of "0/50". Runs once per mount; the SSE stream covers updates
    // afterwards. SettlementStore.list() is unsorted (insertion order), so we
    // sort newest-first here. Failures are silently swallowed — the SSE stream
    // will populate the UI as soon as the server is reachable.
    void getSettlements()
      .then(({ items }) => {
        if (cancelled) return;
        const confirmed: SettlementReceipt[] = [];
        for (const raw of items) {
          const parsed = SettlementReceiptSchema.safeParse(raw);
          if (parsed.success && parsed.data.status === "confirmed") {
            confirmed.push(parsed.data);
          }
        }
        confirmed.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setState((s) => ({
          ...s,
          // Reason: take the larger of the two so an SSE event that arrived
          // before the backfill resolves does not regress the displayed count.
          settlementCount: Math.max(s.settlementCount, confirmed.length),
          confirmedReceipts: mergeDedupe(confirmed, s.confirmedReceipts).slice(
            0,
            MAX_LEDGER_HISTORY,
          ),
        }));
      })
      .catch(() => {
        /* server not reachable yet — SSE will populate state when it is */
      });

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
        const receipt = parsed.data;
        const isConfirmed = receipt.status === "confirmed";
        setState((s) => ({
          ...s,
          // Reason: lastReceipt still updates on failed receipts so BuyerPanel
          // can render a "settlement failed" state. Only confirmed receipts
          // advance the hackathon-gate counter and the ledger.
          lastReceipt: receipt,
          settlementCount: isConfirmed ? s.settlementCount + 1 : s.settlementCount,
          confirmedReceipts: isConfirmed
            ? mergeDedupe([receipt], s.confirmedReceipts).slice(0, MAX_LEDGER_HISTORY)
            : s.confirmedReceipts,
        }));
      },
    });
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  return state;
}
