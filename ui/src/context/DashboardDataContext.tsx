import type { JSX, ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";

import { useAuctionStream } from "../hooks/useAuctionStream.js";
import { useBids } from "../hooks/useBids.js";
import { useControlState } from "../hooks/useControlState.js";
import { useInventory } from "../hooks/useInventory.js";

export interface DashboardDataContextValue {
  connected: boolean;
  settlementCount: number;
  auctions: ReturnType<typeof useAuctionStream>["auctions"];
  lastAuction: ReturnType<typeof useAuctionStream>["lastAuction"];
  lastReceipt: ReturnType<typeof useAuctionStream>["lastReceipt"];
  confirmedReceipts: ReturnType<typeof useAuctionStream>["confirmedReceipts"];
  listings: ReturnType<typeof useInventory>["listings"];
  refreshInventory: ReturnType<typeof useInventory>["refresh"];
  bids: ReturnType<typeof useBids>["bids"];
  refreshBids: ReturnType<typeof useBids>["refresh"];
  control: ReturnType<typeof useControlState>;
}

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

export function DashboardDataProvider({ children }: { children: ReactNode }): JSX.Element {
  const stream = useAuctionStream();
  const { listings, refresh: refreshInventory } = useInventory();
  const { bids, refresh: refreshBids } = useBids();
  const control = useControlState();

  const value = useMemo<DashboardDataContextValue>(
    () => ({
      connected: stream.connected,
      settlementCount: stream.settlementCount,
      auctions: stream.auctions,
      lastAuction: stream.lastAuction,
      lastReceipt: stream.lastReceipt,
      confirmedReceipts: stream.confirmedReceipts,
      listings,
      refreshInventory,
      bids,
      refreshBids,
      control,
    }),
    [
      stream.connected,
      stream.settlementCount,
      stream.auctions,
      stream.lastAuction,
      stream.lastReceipt,
      stream.confirmedReceipts,
      listings,
      refreshInventory,
      bids,
      refreshBids,
      control,
    ],
  );

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData(): DashboardDataContextValue {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error("useDashboardData must be used within DashboardDataProvider");
  }
  return ctx;
}
