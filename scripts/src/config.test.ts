import { describe, expect, it } from "vitest";

import { assertTestnet, loadScriptsConfig } from "./config.js";

const base = {
  CIRCLE_API_KEY: "k",
  CIRCLE_ENTITY_SECRET:
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  CIRCLE_ENVIRONMENT: "testnet",
  DEPOSIT_AMOUNT_USDC: "0.10",
} as NodeJS.ProcessEnv;

describe("scripts config", () => {
  it("parses a valid testnet env (happy)", () => {
    const cfg = loadScriptsConfig(base);
    expect(cfg.CIRCLE_ENVIRONMENT).toBe("testnet");
  });

  it("defaults DEPOSIT_AMOUNT_USDC when omitted (edge)", () => {
    const { DEPOSIT_AMOUNT_USDC: _d, ...rest } = base;
    expect(loadScriptsConfig(rest).DEPOSIT_AMOUNT_USDC).toBe("0.10");
  });

  it("refuses to run on mainnet without CONFIRM_MAINNET (failure)", () => {
    const cfg = loadScriptsConfig({ ...base, CIRCLE_ENVIRONMENT: "mainnet" });
    const prev = process.env.CONFIRM_MAINNET;
    delete process.env.CONFIRM_MAINNET;
    try {
      expect(() => assertTestnet(cfg)).toThrow(/testnet/);
    } finally {
      if (prev !== undefined) process.env.CONFIRM_MAINNET = prev;
    }
  });
});
