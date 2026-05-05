import type { AssistantUiBlock } from "@ade/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AtlasAssistantBlocks } from "./AtlasAssistantBlocks.js";

const LISTING_ID = "11111111-1111-4111-8111-111111111111";
const TX_HASH = `0x${"a".repeat(64)}`;

describe("<AtlasAssistantBlocks /> auction_receipt", () => {
  it("renders settled status with clearing price, tx hash, and margin note (happy)", () => {
    const blocks: AssistantUiBlock[] = [
      {
        type: "auction_receipt",
        listingId: LISTING_ID,
        clearingPriceUsdc: "0.002000",
        status: "settled",
        arcTxHash: TX_HASH,
        marginNote: "Settled at $0.002000 USDC — uneconomic on traditional rails.",
      },
    ];
    render(<AtlasAssistantBlocks blocks={blocks} />);
    // Two elements legitimately mention 0.002 (price + margin note).
    expect(screen.getAllByText(/0\.002/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/uneconomic on traditional rails/i)).toBeInTheDocument();
    // Short tx hash visible (e.g. 0xaaaa…aaaa).
    expect(screen.getByText(/0xaaaa/i)).toBeInTheDocument();
  });

  it("renders no_eligible_bids without a tx-hash element (edge)", () => {
    const blocks: AssistantUiBlock[] = [
      {
        type: "auction_receipt",
        listingId: LISTING_ID,
        status: "no_eligible_bids",
      },
    ];
    render(<AtlasAssistantBlocks blocks={blocks} />);
    expect(screen.getByText(/no eligible bids/i)).toBeInTheDocument();
    expect(screen.queryByText(/0xaaaa/i)).toBeNull();
  });

  it("renders failed status without crashing (failure)", () => {
    const blocks: AssistantUiBlock[] = [
      {
        type: "auction_receipt",
        listingId: LISTING_ID,
        status: "failed",
        clearingPriceUsdc: "0.001500",
      },
    ];
    render(<AtlasAssistantBlocks blocks={blocks} />);
    expect(screen.getByText(/failed/i)).toBeInTheDocument();
  });
});
