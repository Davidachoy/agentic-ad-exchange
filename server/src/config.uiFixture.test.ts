import { describe, expect, it } from "vitest";

import { loadServerConfig } from "./config.js";

describe("UI_FIXTURE_SEED env", () => {
  it("rejects production + fixture flag (failure)", () => {
    expect(() =>
      loadServerConfig({
        NODE_ENV: "production",
        UI_FIXTURE_SEED: "1",
      } as NodeJS.ProcessEnv),
    ).toThrow(/UI_FIXTURE_SEED/);
  });

  it("parses development + fixture as enabled (happy)", () => {
    const cfg = loadServerConfig({
      NODE_ENV: "development",
      UI_FIXTURE_SEED: "true",
    } as NodeJS.ProcessEnv);
    expect(cfg.uiFixtureSeedEnabled).toBe(true);
  });
});
