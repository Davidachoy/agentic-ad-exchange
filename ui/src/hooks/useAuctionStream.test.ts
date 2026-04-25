import type { SettlementReceipt } from "@ade/shared";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSettlements } from "../api/client.js";
import type { StreamHandlers } from "../api/stream.js";

import { MAX_LEDGER_HISTORY, useAuctionStream } from "./useAuctionStream.js";

let capturedHandlers: StreamHandlers | undefined;

// Reason: vitest hoists vi.mock() above all imports automatically, so these
// stubs run before getSettlements / subscribeToEvents resolve to real modules.
vi.mock("../api/client.js", () => ({
  getSettlements: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock("../api/stream.js", () => ({
  subscribeToEvents: (handlers: StreamHandlers) => {
    capturedHandlers = handlers;
    return () => {
      capturedHandlers = undefined;
    };
  },
}));

function makeReceipt(
  overrides: Partial<SettlementReceipt> & { receiptId: string },
): SettlementReceipt {
  return {
    auctionId: "00000000-0000-0000-0000-000000000000",
    buyerWallet: `0x${"a".repeat(40)}`,
    sellerWallet: `0x${"b".repeat(40)}`,
    gatewayContract: `0x${"c".repeat(40)}`,
    amountUsdc: "0.008000",
    eip3009Nonce: `0x${"e".repeat(64)}`,
    status: "confirmed",
    arcTxHash: `0x${"d".repeat(64)}`,
    createdAt: "2026-04-25T00:00:00.000Z",
    confirmedAt: "2026-04-25T00:00:01.000Z",
    ...overrides,
  };
}

function uuidFor(i: number): string {
  return `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`;
}

describe("useAuctionStream", () => {
  beforeEach(() => {
    capturedHandlers = undefined;
    vi.mocked(getSettlements).mockReset();
    vi.mocked(getSettlements).mockResolvedValue({ items: [] });
  });

  it("emits 3 confirmed → settlementCount=3 + confirmedReceipts.length=3 (happy)", async () => {
    const { result } = renderHook(() => useAuctionStream());
    await waitFor(() => expect(capturedHandlers).toBeDefined());

    act(() => {
      for (let i = 1; i <= 3; i++) {
        capturedHandlers?.onSettlementConfirmed?.(makeReceipt({ receiptId: uuidFor(i) }));
      }
    });

    expect(result.current.settlementCount).toBe(3);
    expect(result.current.confirmedReceipts).toHaveLength(3);
    // Newest-first ordering: most recently emitted is at index 0.
    expect(result.current.confirmedReceipts[0]?.receiptId).toBe(uuidFor(3));
  });

  it("caps confirmedReceipts at MAX_LEDGER_HISTORY (edge)", async () => {
    const { result } = renderHook(() => useAuctionStream());
    await waitFor(() => expect(capturedHandlers).toBeDefined());

    act(() => {
      for (let i = 1; i <= MAX_LEDGER_HISTORY + 10; i++) {
        capturedHandlers?.onSettlementConfirmed?.(makeReceipt({ receiptId: uuidFor(i) }));
      }
    });

    expect(result.current.settlementCount).toBe(MAX_LEDGER_HISTORY + 10);
    expect(result.current.confirmedReceipts).toHaveLength(MAX_LEDGER_HISTORY);
  });

  it("does not increment settlementCount on a failed receipt (failure)", async () => {
    const { result } = renderHook(() => useAuctionStream());
    await waitFor(() => expect(capturedHandlers).toBeDefined());

    act(() => {
      capturedHandlers?.onSettlementConfirmed?.(makeReceipt({ receiptId: uuidFor(1) }));
      capturedHandlers?.onSettlementConfirmed?.(
        makeReceipt({
          receiptId: uuidFor(2),
          status: "failed",
          arcTxHash: undefined,
        }),
      );
    });

    expect(result.current.settlementCount).toBe(1);
    expect(result.current.confirmedReceipts).toHaveLength(1);
    // lastReceipt still updates so BuyerPanel can surface the failure state.
    expect(result.current.lastReceipt?.status).toBe("failed");
  });
});
