import type { AgentTool, SellerAgent, SellerAgentRunResult } from "@ade/agent-seller";
import { AssistantChatRequestSchema } from "@ade/shared";
import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

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
      makeAppWithStubReply(async (_messages, _context, _shape) => ({
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

  it("forwards role:'seller' and mode to the replyGenerator (happy)", async () => {
    const calls: { role: string; mode: string | undefined }[] = [];
    const res = await request(
      makeAppWithStubReply(async (_messages, _context, shape) => {
        calls.push({ role: shape.role, mode: shape.mode });
        return { reply: `seller:${shape.mode ?? "no-mode"}` };
      }),
    )
      .post("/assistant/chat")
      .send({ ...body, role: "seller", mode: "set_floor" })
      .expect(200);
    expect(res.body.reply).toBe("seller:set_floor");
    expect(calls).toEqual([{ role: "seller", mode: "set_floor" }]);
  });

  it("forwards mode:'run_auction' for role:'seller' to the replyGenerator (happy)", async () => {
    const calls: { role: string; mode: string | undefined }[] = [];
    const res = await request(
      makeAppWithStubReply(async (_messages, _context, shape) => {
        calls.push({ role: shape.role, mode: shape.mode });
        return { reply: `seller:${shape.mode ?? "no-mode"}` };
      }),
    )
      .post("/assistant/chat")
      .send({ ...body, role: "seller", mode: "run_auction" })
      .expect(200);
    expect(res.body.reply).toBe("seller:run_auction");
    expect(calls).toEqual([{ role: "seller", mode: "run_auction" }]);
  });

  it("invokes the sellerChatAgentFactory when mode is run_auction (happy)", async () => {
    const run = vi.fn(
      async (_msg: string): Promise<SellerAgentRunResult> => ({
        output: "Settled.",
        toolCalls: ["runAuction"],
        iterations: 2,
        lastToolResult: {
          name: "runAuction",
          value: {
            kind: "settled",
            listingId: "11111111-1111-4111-8111-111111111111",
            clearingPriceUsdc: "0.002000",
            status: "confirmed",
            arcTxHash: `0x${"a".repeat(64)}`,
          },
        },
      }),
    );
    const fakeAgent: SellerAgent = {
      tools: [] as ReadonlyArray<AgentTool<unknown, unknown>>,
      run,
    };
    const factory = vi.fn(() => fakeAgent);

    const app = express();
    app.use(express.json());
    app.use(
      createAssistantRouter({
        gemini: null,
        rateLimitPerMin: 10_000,
        sellerChatAgentFactory: factory,
        logger: testLog,
      }),
    );

    const res = await request(app)
      .post("/assistant/chat")
      .send({ ...body, role: "seller", mode: "run_auction" })
      .expect(200);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0]?.[0]).toContain("[mode=run_auction]");
    expect(res.body.reply).toBe("Settled.");
    expect(res.body.blocks).toHaveLength(1);
    expect(res.body.blocks[0].type).toBe("auction_receipt");
  });

  it("does not invoke sellerChatAgentFactory in ask mode (edge)", async () => {
    const factory = vi.fn();
    const app = express();
    app.use(express.json());
    app.use(
      createAssistantRouter({
        gemini: null,
        rateLimitPerMin: 10_000,
        sellerChatAgentFactory: factory,
        logger: testLog,
      }),
    );

    // ask mode + no Gemini configured + no replyGenerator → 503 (existing path).
    await request(app)
      .post("/assistant/chat")
      .send({ ...body, role: "seller", mode: "ask" })
      .expect(503);
    expect(factory).not.toHaveBeenCalled();
  });

  it("defaults role to 'buyer' when omitted from the request body (edge)", async () => {
    const calls: { role: string; mode: string | undefined }[] = [];
    const res = await request(
      makeAppWithStubReply(async (_messages, _context, shape) => {
        calls.push({ role: shape.role, mode: shape.mode });
        return { reply: "ok" };
      }),
    )
      .post("/assistant/chat")
      .send(body)
      .expect(200);
    expect(res.body.reply).toBe("ok");
    expect(calls).toEqual([{ role: "buyer", mode: undefined }]);
  });
});
