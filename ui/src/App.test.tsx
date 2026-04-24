import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App.js";

describe("<App />", () => {
  it("renders the transaction counter starting at 0 (happy)", () => {
    render(<App />);
    const counter = screen.getByRole("status", { name: /transaction counter/i });
    expect(counter).toHaveTextContent("0");
  });

  it("renders the margin explainer region (edge)", () => {
    render(<App />);
    const region = screen.getByRole("region", { name: /margin/i });
    expect(region).toBeInTheDocument();
  });

  it("renders the auction feed region (failure state – no auctions yet)", () => {
    render(<App />);
    const region = screen.getByRole("region", { name: /auction feed/i });
    expect(region).toHaveTextContent(/no auctions/i);
  });
});
