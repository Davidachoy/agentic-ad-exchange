import { describe, expect, it } from "vitest";

import { getSimulatedAtlasReply } from "./atlasComposerSimulation.js";

describe("getSimulatedAtlasReply", () => {
  it("returns goal copy regardless of text (happy)", () => {
    expect(getSimulatedAtlasReply("goal", "anything")).toMatch(/Campaign objective updated/i);
  });

  it("returns policy copy regardless of text (happy)", () => {
    expect(getSimulatedAtlasReply("policy", "")).toMatch(/Policy saved/i);
  });

  it("matches bid/CPM keywords in direct mode (happy)", () => {
    expect(getSimulatedAtlasReply("direct", "Raise my CPM")).toMatch(/Roku CTV/i);
    expect(getSimulatedAtlasReply("direct", "place a bid")).toMatch(/Solstice 1P/i);
  });

  it("matches pause in direct mode (edge)", () => {
    expect(getSimulatedAtlasReply("direct", "Please pause")).toMatch(/Pausing that supply path/i);
  });

  it("does not match bid inside forbidden (edge)", () => {
    expect(getSimulatedAtlasReply("direct", "forbidden topic")).toBe("Understood. Processing that instruction now.");
  });

  it("returns default direct reply when no keyword (edge)", () => {
    expect(getSimulatedAtlasReply("direct", "hello")).toBe("Understood. Processing that instruction now.");
  });
});
