import { useCallback, useEffect, useState } from "react";

import type { BidRequest } from "@ade/shared";

import { getBids } from "../api/client.js";

export interface UseBidsResult {
  bids: BidRequest[];
  refresh: () => Promise<void>;
}

export function useBids(): UseBidsResult {
  const [bids, setBids] = useState<BidRequest[]>([]);

  const refresh = useCallback(async () => {
    try {
      const { items } = await getBids();
      setBids(items);
    } catch {
      // server not reachable yet — stay empty
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 3000);
    return () => clearInterval(id);
  }, [refresh]);

  return { bids, refresh };
}
