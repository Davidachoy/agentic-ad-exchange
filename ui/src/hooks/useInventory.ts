import { useCallback, useEffect, useState } from "react";

import type { AdInventoryListing } from "@ade/shared";

import { getInventory } from "../api/client.js";

export interface UseInventoryResult {
  listings: AdInventoryListing[];
  refresh: () => Promise<void>;
}

export function useInventory(): UseInventoryResult {
  const [listings, setListings] = useState<AdInventoryListing[]>([]);

  const refresh = useCallback(async () => {
    try {
      const { items } = await getInventory();
      setListings(items);
    } catch {
      // server not reachable yet — stay empty
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 5000);
    return () => clearInterval(id);
  }, [refresh]);

  return { listings, refresh };
}
