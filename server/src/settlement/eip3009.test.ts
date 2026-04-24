import { describe, expect, it } from "vitest";

import { createInMemoryNonceStore } from "../nonces/store.js";

import { buildTypedData, reserveNonce } from "./eip3009.js";

const wallet = (s: string) => `0x${s.padStart(40, "0")}`;
const nonce = (s: string) => `0x${s.padStart(64, "0")}`;

const now = Math.floor(Date.now() / 1000);
const validArgs = {
  from: wallet("1"),
  to: wallet("2"),
  valueUsdcAtomic: "5000", // 0.005 USDC in atomic units
  validAfter: now - 60,
  validBefore: now + 3600,
  nonce: nonce("a"),
  chainId: 421614,
  verifyingContract: wallet("3"),
};

describe("buildTypedData", () => {
  it("produces the EIP-3009 typed-data shape for a valid authorization (happy)", () => {
    const td = buildTypedData(validArgs);
    expect(td.primaryType).toBe("TransferWithAuthorization");
    expect(td.domain.chainId).toBe(validArgs.chainId);
    expect(td.message.from).toBe(validArgs.from);
    expect(td.message.nonce).toBe(validArgs.nonce);
    // Spec requires these fields in the struct in this order.
    expect(td.types.TransferWithAuthorization.map((t) => t.name)).toEqual([
      "from",
      "to",
      "value",
      "validAfter",
      "validBefore",
      "nonce",
    ]);
  });

  it("rejects a zero chainId (edge / known-good-vector guard)", () => {
    expect(() => buildTypedData({ ...validArgs, chainId: 0 })).toThrow();
  });

  it("rejects an expired validBefore (failure)", () => {
    expect(() =>
      buildTypedData({ ...validArgs, validBefore: now - 1 }),
    ).toThrow(/validBefore/);
  });
});

describe("reserveNonce", () => {
  it("rejects a reused nonce", async () => {
    const store = createInMemoryNonceStore();
    expect(await reserveNonce(store, wallet("1"), nonce("a"))).toBe(true);
    expect(await reserveNonce(store, wallet("1"), nonce("a"))).toBe(false);
  });
});
