import { describe, expect, it } from "vitest";

import { createInMemoryNonceStore } from "./store.js";

const depositor = "0x1111111111111111111111111111111111111111";
const nonce = (s: string) => `0x${s.padStart(64, "0")}`;

describe("createInMemoryNonceStore", () => {
  it("claims a fresh nonce (happy)", async () => {
    const store = createInMemoryNonceStore();
    expect(await store.claim(depositor, nonce("a"))).toBe(true);
    expect(await store.size()).toBe(1);
  });

  it("treats claim as case-insensitive on the depositor (edge)", async () => {
    const store = createInMemoryNonceStore();
    await store.claim(depositor, nonce("a"));
    expect(await store.has(depositor.toUpperCase(), nonce("a"))).toBe(true);
  });

  it("rejects a reused nonce for the same depositor (failure)", async () => {
    const store = createInMemoryNonceStore();
    await store.claim(depositor, nonce("a"));
    expect(await store.claim(depositor, nonce("a"))).toBe(false);
  });
});
