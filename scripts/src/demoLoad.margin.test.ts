import { describe, expect, it } from "vitest";

import { buildMarginExplainer } from "./demoLoad.margin.js";

describe("buildMarginExplainer", () => {
  it("prints the 50 × $0.01 reference case (happy path)", () => {
    const lines = buildMarginExplainer({ cycles: 50, totalUsdcSettled: "0.500000" });
    const joined = lines.join("\n");
    expect(joined).toContain("Cycles settled: 50");
    expect(joined).toContain("USDC moved via Circle Nanopayments: $0.500000");
    expect(joined).toContain("50 × $0.30");
    expect(joined).toContain("$15.000000");
  });

  it("returns a zero-cycles banner without crashing (edge)", () => {
    const lines = buildMarginExplainer({ cycles: 0, totalUsdcSettled: "0.000000" });
    expect(lines.join("\n")).toMatch(/0 cycles executed/);
  });

  it("rejects a negative cycle count (failure)", () => {
    expect(() => buildMarginExplainer({ cycles: -1, totalUsdcSettled: "0.000000" })).toThrow(/≥ 0/);
  });
});
