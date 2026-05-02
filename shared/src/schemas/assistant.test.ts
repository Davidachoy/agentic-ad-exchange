import { describe, expect, it } from "vitest";

import { AssistantChatRequestSchema, DashboardAssistantContextSchema } from "./assistant.js";

const minimalContext = {
  generatedAt: new Date().toISOString(),
  sseConnected: true,
  demoPaused: false,
  settlementCount: 0,
  listings: [],
  bids: [],
  recentAuctions: [],
  lastAuction: null,
  lastReceipt: null,
};

describe("AssistantChatRequestSchema", () => {
  it("accepts a valid request (happy)", () => {
    const parsed = AssistantChatRequestSchema.safeParse({
      messages: [{ role: "user", content: "Hello" }],
      context: minimalContext,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty user content (edge)", () => {
    const parsed = AssistantChatRequestSchema.safeParse({
      messages: [{ role: "user", content: "" }],
      context: minimalContext,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects missing messages (failure)", () => {
    const parsed = AssistantChatRequestSchema.safeParse({
      context: minimalContext,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("DashboardAssistantContextSchema", () => {
  it("parses minimal context", () => {
    const r = DashboardAssistantContextSchema.safeParse(minimalContext);
    expect(r.success).toBe(true);
  });
});
