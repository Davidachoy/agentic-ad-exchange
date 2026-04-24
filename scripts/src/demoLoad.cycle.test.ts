import type { CircleClient } from "@ade/wallets";
import { describe, expect, it, vi } from "vitest";

import { pickBidAmount, runDemoCycle } from "./demoLoad.cycle.js";

function mockCircle(overrides: Partial<CircleClient> = {}): CircleClient {
  return {
    config: {} as unknown as CircleClient["config"],
    createWalletSet: vi.fn(),
    createWallet: vi.fn(),
    getBalance: vi.fn(),
    listTransactions: vi.fn(),
    transfer: vi.fn(async () => ({ transactionId: "tx-abc", status: "queued" as const })),
    waitForTx: vi.fn(async () => ({
      transactionId: "tx-abc",
      txHash: `0x${"c".repeat(64)}`,
      state: "COMPLETE" as const,
      blockchain: "ARC-TESTNET",
    })),
    ...overrides,
  } as CircleClient;
}

const buyer = `0x${"1".repeat(40)}`;
const seller = `0x${"2".repeat(40)}`;

describe("runDemoCycle", () => {
  it("settles one bid/auction/transfer cycle (happy path)", async () => {
    const circle = mockCircle();
    const result = await runDemoCycle({
      circle,
      buyerWalletId: "buyer-w",
      buyerAddress: buyer,
      sellerAddress: seller,
      floorUsdc: "0.001",
      rand: () => 0.5,
    });
    expect(result.state).toBe("COMPLETE");
    expect(result.txHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(result.explorerUrl).toContain("/tx/0x");
    // Clearing price must be capped at MAX_CLEARING_PRICE_USDC = "0.01".
    expect(result.clearingPrice).toMatch(/^0\.0[01][0-9]{4}$/);
    expect(circle.transfer).toHaveBeenCalledWith(
      expect.objectContaining({
        walletId: "buyer-w",
        destinationAddress: seller,
      }),
    );
  });

  it("clamps bid to the $0.01 cap when rand returns 0 near the cap (edge)", () => {
    // floor + tick = 0.001 + 0.01 = 0.011, which exceeds MAX 0.01 — clamp to cap.
    expect(pickBidAmount("0.001", () => 0)).toBe("0.010000");
  });

  it("propagates waitForTx failures without partial accounting (failure)", async () => {
    const circle = mockCircle({
      waitForTx: vi.fn(async () => {
        throw new Error("FAILED");
      }),
    });
    await expect(
      runDemoCycle({
        circle,
        buyerWalletId: "buyer-w",
        buyerAddress: buyer,
        sellerAddress: seller,
        floorUsdc: "0.001",
        rand: () => 0.3,
      }),
    ).rejects.toThrow(/FAILED/);
  });
});
