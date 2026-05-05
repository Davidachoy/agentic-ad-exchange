import http from "node:http";
import type { AddressInfo } from "node:net";

import {
  createListInventoryTool,
  createRunAuctionTool,
  createServeAdTool,
  createSellerAgent,
  createViewHistoryTool,
  MAX_TOOL_CALLS_PER_TURN,
  SELLER_CHAT_SYSTEM_PROMPT,
  wrapWithFloorCap,
  type AgentTool,
  type LlmAdapter,
  type LlmDecision,
  type SellerAgent,
} from "@ade/agent-seller";
import type { CircleClient } from "@ade/wallets";
import type { Logger } from "pino";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp, type AppHandles } from "../app.js";

const SELLER_AGENT_ID = "seller-default";
const SELLER_WALLET = `0x${"3".padStart(40, "0")}`;
const BUYER_WALLET = `0x${"2".padStart(40, "0")}`;
const ARC_TX_HASH = `0x${"a".repeat(64)}`;
const FIXED_LISTING_ID = "11111111-1111-4111-8111-111111111111";

const wallet = (s: string) => `0x${s.padStart(40, "0")}`;
const nonce = (s: string) => `0x${s.padStart(64, "0")}`;

const baseBid = {
  buyerAgentId: "buyer-1",
  buyerWallet: BUYER_WALLET,
  targeting: { adType: "display", format: "banner", size: "300x250", contextTags: [] },
  budgetRemainingUsdc: "1.000000",
  createdAt: "2026-04-22T12:00:00Z",
};

function makeBid(i: number, amount: string) {
  return {
    ...baseBid,
    bidId: `00000000-0000-4000-8000-${i.toString().padStart(12, "0")}`,
    bidAmountUsdc: amount,
    nonce: nonce(i.toString(16)),
  };
}

function makeCircleClient(): CircleClient {
  return {
    config: {} as never,
    createWalletSet: vi.fn(),
    createWallet: vi.fn(),
    getBalance: vi.fn(),
    listTransactions: vi.fn(),
    transfer: vi.fn().mockResolvedValue({ transactionId: "tx-99", status: "confirmed" }),
    waitForTx: vi.fn().mockResolvedValue({
      transactionId: "tx-99",
      txHash: ARC_TX_HASH,
      state: "COMPLETE",
      blockchain: "ARC-TESTNET",
    }),
  };
}

function silentLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: () => silentLogger(),
  } as unknown as Logger;
}

function fakeLlm(decisions: Array<LlmDecision<string>>): LlmAdapter {
  let i = 0;
  return {
    async step() {
      const d = decisions[i];
      i += 1;
      if (!d) throw new Error(`fake llm exhausted at index ${i - 1}`);
      return d;
    },
  };
}

function buildChatAgent(
  llm: LlmAdapter,
  exchangeUrl: string,
  randomUuidImpl: () => string,
): SellerAgent {
  const tools: AgentTool<unknown, unknown>[] = [
    wrapWithFloorCap(
      createListInventoryTool({
        exchangeUrl,
        sellerAgentId: SELLER_AGENT_ID,
        sellerWallet: SELLER_WALLET,
        randomUuidImpl,
      }),
    ),
    createRunAuctionTool({ exchangeUrl }),
    createServeAdTool({ exchangeUrl }),
    createViewHistoryTool({ exchangeUrl }),
  ] as unknown as AgentTool<unknown, unknown>[];

  return createSellerAgent({
    llm,
    tools,
    systemPrompt: SELLER_CHAT_SYSTEM_PROMPT,
    maxToolCalls: MAX_TOOL_CALLS_PER_TURN,
  });
}

let handles: AppHandles | null = null;
let httpServer: http.Server | null = null;
let exchangeUrl = "";

beforeEach(async () => {
  // Two-turn script — turn 1: register; turn 2: close. Single LlmAdapter shared
  // across both agent instances; the factory hands it off so each /chat call
  // pulls the next decision from the queue.
  const decisions: Array<LlmDecision<string>> = [
    {
      toolCall: {
        name: "listInventory",
        args: {
          adType: "display",
          format: "banner",
          size: "300x250",
          contextualExclusions: [],
          floorPriceUsdc: "0.003",
        },
      },
    },
    { final: "Listed." },
    { toolCall: { name: "runAuction", args: { listingId: FIXED_LISTING_ID } } },
    { final: "Settled at $0.0028 — uneconomic on traditional rails." },
  ];
  const llm = fakeLlm(decisions);

  handles = createApp({
    corsAllowOrigins: ["http://localhost:5173"],
    bidRateLimitPerMin: 120,
    circleClient: makeCircleClient(),
    buyerWalletId: "buyer-wallet-1",
    autoClearDelayMs: 0, // manual close — auto-clear exercised separately.
    logger: silentLogger(),
  });

  httpServer = http.createServer(handles.app);
  await new Promise<void>((resolve) => httpServer!.listen(0, "127.0.0.1", () => resolve()));
  const addr = httpServer.address() as AddressInfo;
  exchangeUrl = `http://127.0.0.1:${addr.port}`;

  // Re-mount the assistant router with the chat-agent factory wired in.
  // (createApp built it without the factory; we install one now via a fresh
  // route on the same handles by calling registerRoutes is overkill — instead
  // we rebuild the app with the factory pre-set.)
  // Rebuild with factory:
  handles.autoClearScheduler.shutdown();
  await new Promise<void>((resolve) => httpServer!.close(() => resolve()));

  handles = createApp({
    corsAllowOrigins: ["http://localhost:5173"],
    bidRateLimitPerMin: 120,
    circleClient: makeCircleClient(),
    buyerWalletId: "buyer-wallet-1",
    autoClearDelayMs: 0,
    sellerChatAgentFactory: () => buildChatAgent(llm, exchangeUrl, () => FIXED_LISTING_ID),
    logger: silentLogger(),
  });

  httpServer = http.createServer(handles.app);
  await new Promise<void>((resolve) => httpServer!.listen(0, "127.0.0.1", () => resolve()));
  const addr2 = httpServer.address() as AddressInfo;
  exchangeUrl = `http://127.0.0.1:${addr2.port}`;
});

afterEach(async () => {
  handles?.autoClearScheduler.shutdown();
  if (httpServer) {
    await new Promise<void>((resolve) => httpServer!.close(() => resolve()));
  }
  handles = null;
  httpServer = null;
});

describe("seller chat agent — full integration", () => {
  it("registers a listing then closes it on a second chat turn", async () => {
    const matched: unknown[] = [];
    const settled: unknown[] = [];
    handles!.eventBus.on("auction.matched", (p) => matched.push(p));
    handles!.eventBus.on("settlement.confirmed", (p) => settled.push(p));

    const baseContext = {
      generatedAt: "2026-04-22T12:00:00Z",
      sseConnected: false,
      demoPaused: false,
      settlementCount: 0,
      listings: [],
      bids: [],
      recentAuctions: [],
      lastAuction: null,
      lastReceipt: null,
    };

    // Turn 1: register listing via chat.
    const turn1 = await request(handles!.app)
      .post("/assistant/chat")
      .send({
        messages: [
          {
            role: "user",
            content: "register a 300x250 banner with a 0.003 floor",
          },
        ],
        context: baseContext,
        role: "seller",
        mode: "set_floor",
      });
    expect(turn1.status).toBe(200);
    const listingsAfter = await handles!.listingStore.list();
    expect(listingsAfter).toHaveLength(1);
    expect(listingsAfter[0]?.listingId).toBe(FIXED_LISTING_ID);

    // Two bids — second-price math fires on close.
    await request(handles!.app).post("/bid").send(makeBid(1, "0.005000")).expect(202);
    await request(handles!.app).post("/bid").send(makeBid(2, "0.004000")).expect(202);

    // Turn 2: close the listing via chat.
    const turn2 = await request(handles!.app)
      .post("/assistant/chat")
      .send({
        messages: [
          { role: "user", content: "register" },
          { role: "assistant", content: "Listed." },
          { role: "user", content: `close listing ${FIXED_LISTING_ID}` },
        ],
        context: baseContext,
        role: "seller",
        mode: "run_auction",
      });
    expect(turn2.status).toBe(200);
    expect(turn2.body.blocks).toHaveLength(1);
    const block = turn2.body.blocks[0];
    expect(block.type).toBe("auction_receipt");
    expect(block.status).toBe("settled");
    expect(typeof block.clearingPriceUsdc).toBe("string");
    expect(block.arcTxHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(block.marginNote).toMatch(/uneconomic/i);

    expect(matched).toHaveLength(1);
    expect(settled).toHaveLength(1);
    void wallet;
  });
});
