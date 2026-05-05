import { describe, expect, it } from "vitest";

import { addUsdc, fromAtomic, gtUsdc, gteUsdc, minUsdc, toAtomic } from "./money.js";

describe("toAtomic / fromAtomic", () => {
  it("round-trips zero (edge)", () => {
    expect(toAtomic("0")).toBe(0n);
    expect(fromAtomic(0n)).toBe("0.000000");
  });

  it("preserves the smallest USDC unit (edge)", () => {
    expect(toAtomic("0.000001")).toBe(1n);
    expect(fromAtomic(1n)).toBe("0.000001");
  });

  it("converts a typical sub-cent value (happy)", () => {
    expect(toAtomic("0.005")).toBe(5_000n);
    expect(fromAtomic(5_000n)).toBe("0.005000");
  });
});

describe("gtUsdc / gteUsdc", () => {
  it("gtUsdc returns true when a > b strictly (happy)", () => {
    expect(gtUsdc("0.011", "0.01")).toBe(true);
  });

  it("gtUsdc returns false on equality (edge)", () => {
    expect(gtUsdc("0.01", "0.01")).toBe(false);
  });

  it("gteUsdc returns true on equality (edge)", () => {
    expect(gteUsdc("0.01", "0.01")).toBe(true);
  });
});

describe("addUsdc / minUsdc", () => {
  it("addUsdc adds two decimal-string amounts (happy)", () => {
    expect(addUsdc("0.001", "0.002")).toBe("0.003000");
  });

  it("minUsdc returns the smaller normalized amount (happy)", () => {
    expect(minUsdc("0.005", "0.0049")).toBe("0.004900");
  });
});
