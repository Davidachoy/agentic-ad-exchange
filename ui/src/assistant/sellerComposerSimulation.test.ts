import { describe, expect, it } from "vitest";

import { getSimulatedSellerReply } from "./sellerComposerSimulation.js";

describe("getSimulatedSellerReply", () => {
  it("returns ask guidance with message (happy)", () => {
    const r = getSimulatedSellerReply("ask", "what should I do?");
    expect(r).toMatch(/Revenue/i);
    expect(r).toMatch(/Floors/i);
  });

  it("returns ask guidance when message empty (edge)", () => {
    const r = getSimulatedSellerReply("ask", "   ");
    expect(r).toMatch(/Analyze/i);
  });

  it("returns CTV floor projection when placement and price present (happy)", () => {
    const r = getSimulatedSellerReply("set_floor", "Set CTV pre-roll floor to $3.20");
    expect(r).toMatch(/Dropping CTV pre-roll/i);
    expect(r).toMatch(/68%/);
  });

  it("returns default floor note without strong signals (edge)", () => {
    const r = getSimulatedSellerReply("set_floor", "hello");
    expect(r).toMatch(/Floor update noted/i);
    expect(r).toMatch(/Atlas will apply/i);
  });

  it("returns structured deal draft (happy)", () => {
    const r = getSimulatedSellerReply("configure_deal", "anything");
    expect(r).toMatch(/Northwave/i);
    expect(r).toMatch(/\$4\.80/);
  });

  it("returns block buyer impact (happy)", () => {
    const r = getSimulatedSellerReply("block_buyer", "Trade Desk");
    expect(r).toMatch(/Trade Desk/i);
    expect(r).toMatch(/-\$340/i);
  });

  it("returns analyze narrative (happy)", () => {
    const r = getSimulatedSellerReply("analyze", "why");
    expect(r).toMatch(/CTV pre-roll/i);
  });
});
