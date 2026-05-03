import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AtlasRightPanel } from "./AtlasRightPanel.js";

function mockControl() {
  return {
    paused: false,
    pending: false,
    pause: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
  };
}

function renderPanel() {
  return render(
    <AtlasRightPanel
      connected
      paused={false}
      settlementCount={0}
      bidCount={0}
      listingCount={0}
      lastAuction={null}
      lastReceipt={null}
      control={mockControl()}
    />,
  );
}

describe("<AtlasRightPanel />", () => {
  it("defaults to Monitor with calm empty state when there are no exceptions (happy)", () => {
    renderPanel();
    expect(screen.getByRole("heading", { name: /atlas workspace/i })).toBeInTheDocument();
    expect(screen.getByText(/atlas is operating within policy/i)).toBeInTheDocument();
  });

  it("shows Review tab badge matching pending decision count (edge)", () => {
    renderPanel();
    const reviewTab = screen.getByRole("tab", { name: /review/i });
    expect(within(reviewTab).getByText("2")).toBeInTheDocument();
  });

  it("switches to Create and shows step 1 objective flow (happy)", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("tab", { name: /^create$/i }));
    expect(screen.getByPlaceholderText(/tell atlas what you want to achieve/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next: inventory/i })).toBeInTheDocument();
  });
});
