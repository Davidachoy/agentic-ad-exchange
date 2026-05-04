import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SellerYieldComposer } from "./SellerYieldComposer.js";

describe("<SellerYieldComposer />", () => {
  it("opens + menu, applies structured mode chip, clears with × (happy)", async () => {
    const user = userEvent.setup();
    render(<SellerYieldComposer onSend={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /add yield mode/i }));
    await user.click(screen.getByRole("menuitem", { name: /set floor/i }));

    expect(screen.getByRole("button", { name: /clear set floor mode/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /clear set floor mode/i }));
    expect(screen.queryByRole("button", { name: /clear set floor mode/i })).not.toBeInTheDocument();
  });
});
