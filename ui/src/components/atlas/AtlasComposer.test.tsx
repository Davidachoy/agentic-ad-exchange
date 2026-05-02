import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AtlasComposer } from "./AtlasComposer.js";

describe("<AtlasComposer />", () => {
  it("does not call onSend when input is empty (edge)", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<AtlasComposer onSend={onSend} />);
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/enter a message/i);
  });

  it("calls onSend with trimmed text (happy)", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<AtlasComposer onSend={onSend} />);
    await user.type(screen.getByLabelText("Message to Atlas"), "  Hello Atlas  ");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(onSend).toHaveBeenCalledWith("Hello Atlas");
  });
});
