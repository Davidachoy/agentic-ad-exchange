import { describe, expect, it } from "vitest";

import {
  AssistantChatRequestSchema,
  AssistantChatResponseSchema,
  DashboardAssistantContextSchema,
  parseAssistantChatResponse,
} from "./assistant.js";

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

describe("AssistantChatResponseSchema", () => {
  it("accepts reply only (happy)", () => {
    const r = AssistantChatResponseSchema.safeParse({ reply: "Hello" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.blocks).toBeUndefined();
  });

  it("accepts valid blocks (edge)", () => {
    const r = AssistantChatResponseSchema.safeParse({
      reply: "OK",
      blocks: [
        {
          type: "metrics_strip",
          items: [
            { label: "SSE", value: "live", dataSource: "exchange" },
            { label: "VCR", value: "92%", dataSource: "simulated" },
          ],
        },
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe("parseAssistantChatResponse", () => {
  it("drops invalid blocks but keeps valid ones (failure)", () => {
    const out = parseAssistantChatResponse({
      reply: "Summary",
      blocks: [
        { type: "metrics_strip", items: [] },
        {
          type: "metrics_strip",
          items: [{ label: "A", value: "1", dataSource: "exchange" }],
        },
      ],
    });
    expect(out.reply).toBe("Summary");
    expect(out.blocks).toHaveLength(1);
    expect(out.blocks?.[0].type).toBe("metrics_strip");
  });

  it("accepts a bar_chart block (happy)", () => {
    const out = parseAssistantChatResponse({
      reply: "Aquí tienes el gráfico.",
      blocks: [
        {
          type: "bar_chart",
          title: "Puja por comprador",
          yCaption: "USDC (aprox.)",
          dataSource: "exchange",
          points: [
            { label: "buyer-a", value: 0.02 },
            { label: "buyer-b", value: 0.015 },
          ],
        },
      ],
    });
    expect(out.reply).toBe("Aquí tienes el gráfico.");
    expect(out.blocks).toHaveLength(1);
    expect(out.blocks?.[0].type).toBe("bar_chart");
    if (out.blocks?.[0].type === "bar_chart") {
      expect(out.blocks[0].points).toHaveLength(2);
    }
  });

  it("accepts bar_chart with string numeric values and missing dataSource (Gemini-shaped)", () => {
    const out = parseAssistantChatResponse({
      reply: "Chart below.",
      blocks: [
        {
          type: "bar_chart",
          title: "Bids by buyer",
          points: [
            { label: "buyer-a", value: "0.012" },
            { label: "buyer-b", value: "0.009000" },
          ],
        },
      ],
    });
    expect(out.blocks).toHaveLength(1);
    expect(out.blocks?.[0].type).toBe("bar_chart");
    if (out.blocks?.[0].type === "bar_chart") {
      expect(out.blocks[0].dataSource).toBe("exchange");
      expect(out.blocks[0].points[0].value).toBeCloseTo(0.012);
    }
  });
});
