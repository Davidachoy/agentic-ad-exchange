/**
 * EIP-3009 nonce store. Each (depositor, nonce) pair must be unique — a
 * duplicate signature would be a replay. In-memory scaffold; later PRPs
 * swap the implementation (SQLite, Postgres) without changing the interface.
 */
export interface NonceStore {
  /**
   * Claim a nonce atomically. Returns true if newly claimed, false if already seen.
   */
  claim(depositor: string, nonce: string): Promise<boolean>;
  has(depositor: string, nonce: string): Promise<boolean>;
  size(): Promise<number>;
}

export function createInMemoryNonceStore(): NonceStore {
  const seen = new Map<string, Set<string>>();
  const keyFor = (depositor: string): string => depositor.toLowerCase();

  return {
    async claim(depositor, nonce) {
      const key = keyFor(depositor);
      let set = seen.get(key);
      if (!set) {
        set = new Set();
        seen.set(key, set);
      }
      if (set.has(nonce)) return false;
      set.add(nonce);
      return true;
    },
    async has(depositor, nonce) {
      return seen.get(keyFor(depositor))?.has(nonce) ?? false;
    },
    async size() {
      let total = 0;
      for (const set of seen.values()) total += set.size;
      return total;
    },
  };
}
