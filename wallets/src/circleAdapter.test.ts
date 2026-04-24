import { describe, expect, it } from "vitest";

import { normalizeUsdcAmount } from "./circleAdapter.js";

describe("normalizeUsdcAmount", () => {
  it("passes through an already-canonical 6-decimal string (happy path)", () => {
    expect(normalizeUsdcAmount("0.100000")).toBe("0.100000");
    expect(normalizeUsdcAmount("5")).toBe("5.000000");
    expect(normalizeUsdcAmount("0.01")).toBe("0.010000");
  });

  it("truncates extra precision the Circle API sometimes returns (edge)", () => {
    // Regression: Circle occasionally returns 7+ decimals after transfers.
    // UsdcAmountSchema requires `\.\d{1,6}`, so we truncate deterministically.
    expect(normalizeUsdcAmount("0.1234567890")).toBe("0.123456");
    expect(normalizeUsdcAmount("0.000000123")).toBe("0.000000");
  });

  it("falls back to zero on empty / malformed / negative input (failure)", () => {
    expect(normalizeUsdcAmount(undefined)).toBe("0.000000");
    expect(normalizeUsdcAmount("")).toBe("0.000000");
    expect(normalizeUsdcAmount("not-a-number")).toBe("0.000000");
    expect(normalizeUsdcAmount("-1.23")).toBe("0.000000");
  });
});
