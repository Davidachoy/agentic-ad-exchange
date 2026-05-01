import type { Logger } from "pino";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAutoClearScheduler } from "./autoClearScheduler.js";
import type { RunAuctionOutcome } from "./runAuction.js";

function makeLogger(): {
  logger: Logger;
  debug: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
} {
  const debug = vi.fn();
  const info = vi.fn();
  const error = vi.fn();
  // Reason: pino has many fields but the scheduler only calls debug/info/error.
  // A partial cast keeps the test focused on the surface we actually exercise.
  const logger = { debug, info, error } as unknown as Logger;
  return { logger, debug, info, error };
}

const settledOutcome: RunAuctionOutcome = {
  kind: "settled",
  auctionResult: {
    auctionId: "11111111-1111-4111-8111-111111111111",
    listingId: "22222222-2222-4222-8222-222222222222",
    winningBidId: "33333333-3333-4333-8333-333333333333",
    winnerBuyerAgentId: "buyer-1",
    winnerBuyerWallet: `0x${"a".repeat(40)}`,
    sellerAgentId: "seller-1",
    sellerWallet: `0x${"b".repeat(40)}`,
    winningBidUsdc: "0.005000",
    clearingPriceUsdc: "0.003000",
    createdAt: "2026-04-22T12:00:00Z",
  },
  receipt: {
    receiptId: "44444444-4444-4444-8444-444444444444",
    auctionId: "11111111-1111-4111-8111-111111111111",
    buyerWallet: `0x${"a".repeat(40)}`,
    sellerWallet: `0x${"b".repeat(40)}`,
    gatewayContract: "0x0000000000000000000000000000000000000000",
    amountUsdc: "0.003000",
    eip3009Nonce: `0x${"f".repeat(64)}`,
    status: "confirmed",
    arcTxHash: `0x${"e".repeat(64)}`,
    createdAt: "2026-04-22T12:00:00Z",
    confirmedAt: "2026-04-22T12:00:01Z",
  },
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("createAutoClearScheduler", () => {
  it("fires runAuction once after the configured delay (happy)", async () => {
    const fakeRunAuction = vi.fn().mockResolvedValue(settledOutcome);
    const { logger, info } = makeLogger();
    const sch = createAutoClearScheduler({
      delayMs: 1000,
      runAuction: fakeRunAuction,
      logger,
    });

    sch.schedule("a");
    expect(sch.pendingCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(1000);

    expect(fakeRunAuction).toHaveBeenCalledTimes(1);
    expect(fakeRunAuction).toHaveBeenCalledWith("a");
    expect(sch.pendingCount()).toBe(0);
    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({ listingId: "a", status: "confirmed" }),
      "auto_clear_settled",
    );
  });

  it("cancel() prevents the timer from firing (edge)", async () => {
    const fakeRunAuction = vi.fn().mockResolvedValue(settledOutcome);
    const { logger } = makeLogger();
    const sch = createAutoClearScheduler({ delayMs: 1000, runAuction: fakeRunAuction, logger });

    sch.schedule("a");
    sch.cancel("a");
    expect(sch.pendingCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(1000);
    expect(fakeRunAuction).not.toHaveBeenCalled();
  });

  it("schedule() is a no-op when delayMs <= 0 (edge)", async () => {
    const fakeRunAuction = vi.fn().mockResolvedValue(settledOutcome);
    const { logger } = makeLogger();
    const sch = createAutoClearScheduler({ delayMs: 0, runAuction: fakeRunAuction, logger });

    sch.schedule("a");
    expect(sch.pendingCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(fakeRunAuction).not.toHaveBeenCalled();
  });

  it("re-scheduling the same listingId is idempotent — fires once (edge)", async () => {
    const fakeRunAuction = vi.fn().mockResolvedValue(settledOutcome);
    const { logger } = makeLogger();
    const sch = createAutoClearScheduler({ delayMs: 1000, runAuction: fakeRunAuction, logger });

    sch.schedule("a");
    sch.schedule("a");
    expect(sch.pendingCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(fakeRunAuction).toHaveBeenCalledTimes(1);
  });

  it("shutdown() clears every pending timer (edge)", async () => {
    const fakeRunAuction = vi.fn().mockResolvedValue(settledOutcome);
    const { logger } = makeLogger();
    const sch = createAutoClearScheduler({ delayMs: 1000, runAuction: fakeRunAuction, logger });

    sch.schedule("a");
    sch.schedule("b");
    expect(sch.pendingCount()).toBe(2);

    sch.shutdown();
    expect(sch.pendingCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(1000);
    expect(fakeRunAuction).not.toHaveBeenCalled();
  });

  it("logs and swallows errors from runAuction (failure)", async () => {
    const fakeRunAuction = vi.fn().mockRejectedValueOnce(new Error("boom"));
    const { logger, error } = makeLogger();
    const sch = createAutoClearScheduler({ delayMs: 1000, runAuction: fakeRunAuction, logger });

    sch.schedule("a");
    // No throw / unhandled rejection — advance through the timer + await its inner promise.
    await vi.advanceTimersByTimeAsync(1000);
    await vi.runAllTicks();

    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error), listingId: "a" }),
      "auto_clear_failed",
    );
    expect(sch.pendingCount()).toBe(0);
  });
});
