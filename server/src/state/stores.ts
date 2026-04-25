import type { AdInventoryListing, BidRequest, SettlementReceipt } from "@ade/shared";

/**
 * In-memory application stores for the scaffold. Real persistence is a later
 * PRP. The interfaces here mean a swap will be one implementation per store.
 */
export interface ListingStore {
  add(listing: AdInventoryListing): Promise<void>;
  list(): Promise<AdInventoryListing[]>;
  get(listingId: string): Promise<AdInventoryListing | undefined>;
  remove(listingId: string): Promise<void>;
}

export interface BidStore {
  add(bid: BidRequest): Promise<void>;
  list(): Promise<BidRequest[]>;
  drain(): Promise<BidRequest[]>;
}

export interface SettlementStore {
  add(receipt: SettlementReceipt): Promise<void>;
  list(): Promise<SettlementReceipt[]>;
  count(): Promise<number>;
}

export function createListingStore(): ListingStore {
  const map = new Map<string, AdInventoryListing>();
  return {
    async add(listing) {
      map.set(listing.listingId, listing);
    },
    async list() {
      return [...map.values()];
    },
    async get(id) {
      return map.get(id);
    },
    async remove(id) {
      map.delete(id);
    },
  };
}

export function createBidStore(): BidStore {
  let queue: BidRequest[] = [];
  return {
    async add(bid) {
      queue.push(bid);
    },
    async list() {
      return [...queue];
    },
    async drain() {
      const out = queue;
      queue = [];
      return out;
    },
  };
}

export function createSettlementStore(): SettlementStore {
  const list: SettlementReceipt[] = [];
  return {
    async add(receipt) {
      list.push(receipt);
    },
    async list() {
      return [...list];
    },
    async count() {
      return list.length;
    },
  };
}
