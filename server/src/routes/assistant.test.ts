import { AssistantChatRequestSchema } from "@ade/shared";
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createLogger } from "../logger.js";
import { createAssistantRouter, type AssistantReplyGenerator } from "./assistant.js";

const testLog = createLogger("silent");

function makeApp(gemini: { apiKey: string; model: string } | null) {
  const app = express();
  app.use(express.json());
  app.use(createAssistantRouter({ gemini, rateLimitPerMin: 10_000, logger: testLog }));
  return app;
}

function makeAppWithStubReply(replyGenerator: AssistantReplyGenerator) {
  const app = express();
  app.use(express.json());
  app.use(
    createAssistantRouter({
      gemini: null,
      rateLimitPerMin: 10_000,
      replyGenerator,
      logger: testLog,
    }),
  );
  return app;
}

const body = AssistantChatRequestSchema.parse({
  messages: [{ role: "user", content: "Summarize metrics." }],
  context: {
    generatedAt: new Date().toISOString(),
    sseConnected: true,
    demoPaused: false,
    settlementCount: 2,
    listings: [],
    bids: [],
    recentAuctions: [],
    lastAuction: null,
    lastReceipt: null,
  },
});

describe("POST /assistant/chat", () => {
  it("returns 503 when Gemini is not configured (happy)", async () => {
    const res = await request(makeApp(null)).post("/assistant/chat").send(body).expect(503);
    expect(res.body).toMatchObject({ code: "gemini_not_configured" });
  });

  it("returns 400 on invalid body (failure)", async () => {
    const res = await request(makeApp(null)).post("/assistant/chat").send({ foo: 1 }).expect(400);
    expect(res.body.code).toBe("invalid_request");
  });

  it("returns 400 when last message is not user (edge)", async () => {
    const bad = {
      ...body,
      messages: [
        { role: "assistant", content: "Hi" },
        { role: "assistant", content: "Again" },
      ],
    };
    const res = await request(makeApp(null)).post("/assistant/chat").send(bad).expect(400);
    expect(res.body.error).toContain("user");
  });

  it("returns reply and blocks when replyGenerator is injected (happy)", async () => {
    const res = await request(
      makeAppWithStubReply(async () => ({
        reply: "OK",
        blocks: [
          {
            type: "metrics_strip",
            items: [{ label: "SSE", value: "live", dataSource: "exchange" }],
          },
        ],
      })),
    )
      .post("/assistant/chat")
      .send(body)
      .expect(200);
    expect(res.body.reply).toBe("OK");
    expect(res.body.blocks).toHaveLength(1);
    expect(res.body.blocks[0].type).toBe("metrics_strip");
  });
});
