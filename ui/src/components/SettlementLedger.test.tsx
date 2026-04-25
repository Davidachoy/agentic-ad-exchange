import type { SettlementReceipt } from "@ade/shared";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettlementLedger } from "./SettlementLedger.js";

const TX_HASH_64 = (seed: string): string => `0x${seed.repeat(64).slice(0, 64)}` as const;

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
    arcTxHash: TX_HASH_64("d"),
    createdAt: "2026-04-25T00:00:00.000Z",
    confirmedAt: "2026-04-25T00:00:01.000Z",
    ...overrides,
  };
}

describe("<SettlementLedger />", () => {
  it("renders 10 confirmed receipts as 10 explorer links (happy)", () => {
    const receipts = Array.from({ length: 10 }, (_, i) =>
      makeReceipt({
        receiptId: `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
        arcTxHash: TX_HASH_64(((i % 9) + 1).toString(16)),
      }),
    );
    render(<SettlementLedger receipts={receipts} sellerAddress={`0x${"f".repeat(40)}`} />);

    const region = screen.getByRole("region", { name: /settlement ledger/i });
    const txLinks = within(region)
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href")?.includes("/tx/"));
    expect(txLinks).toHaveLength(10);
    for (const a of txLinks) {
      expect(a).toHaveAttribute("target", "_blank");
      expect(a).toHaveAttribute("rel", "noopener noreferrer");
      expect(a.getAttribute("href")).toMatch(
        /^https:\/\/testnet\.arcscan\.app\/tx\/0x[a-f0-9]{64}$/,
      );
    }
  });

  it("filters out failed and missing-arcTxHash rows (edge)", () => {
    const receipts: SettlementReceipt[] = [
      makeReceipt({
        receiptId: "00000000-0000-0000-0000-000000000001",
        status: "failed",
        arcTxHash: undefined,
      }),
      makeReceipt({
        receiptId: "00000000-0000-0000-0000-000000000002",
        arcTxHash: undefined,
      }),
    ];
    render(<SettlementLedger receipts={receipts} />);

    const region = screen.getByRole("region", { name: /settlement ledger/i });
    const txLinks = within(region)
      .queryAllByRole("link")
      .filter((a) => a.getAttribute("href")?.includes("/tx/"));
    expect(txLinks).toHaveLength(0);
    expect(region).toHaveTextContent(/no settlements yet/i);
  });

  it("hides the per-address header link when sellerAddress is undefined (failure)", () => {
    render(<SettlementLedger receipts={[]} />);
    const region = screen.getByRole("region", { name: /settlement ledger/i });
    const links = within(region).queryAllByRole("link");
    expect(links).toHaveLength(0);
  });
});
