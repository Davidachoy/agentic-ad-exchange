import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AppRoutes } from "./AppRoutes.js";
import { DashboardDataProvider } from "./context/DashboardDataContext.js";

function renderAt(path: string): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DashboardDataProvider>
        <AppRoutes />
      </DashboardDataProvider>
    </MemoryRouter>,
  );
}

describe("App routes", () => {
  it("renders the transaction counter starting at 0 on Exchange (happy)", () => {
    renderAt("/");
    const counter = screen.getByRole("status", { name: /transaction counter/i });
    expect(counter).toHaveTextContent("0");
  });

  it("renders the margin explainer region on Exchange (edge)", () => {
    renderAt("/");
    const region = screen.getByRole("region", { name: /margin/i });
    expect(region).toBeInTheDocument();
  });

  it("renders the auction feed region on Exchange", () => {
    renderAt("/");
    const region = screen.getByRole("region", { name: /auction feed/i });
    expect(region).toHaveTextContent(/no auctions/i);
  });

  it("renders the settlement ledger region on Exchange", () => {
    renderAt("/");
    const region = screen.getByRole("region", { name: /settlement ledger/i });
    expect(region).toBeInTheDocument();
  });

  it("redirects /atlas to buyer assistant shell", () => {
    renderAt("/atlas");
    expect(screen.getByRole("navigation", { name: "Workspace" })).toBeInTheDocument();
    expect(screen.getByLabelText("Message to Atlas")).toBeInTheDocument();
  });

  it("renders buyer assistant on /buyer", () => {
    renderAt("/buyer");
    expect(screen.getByRole("navigation", { name: "Workspace" })).toBeInTheDocument();
    expect(screen.getByText("Exchange assistant")).toBeInTheDocument();
    expect(screen.getByLabelText("Message to Atlas")).toBeInTheDocument();
    expect(screen.getByLabelText("Assistant workspace header")).toBeInTheDocument();
    expect(screen.getByText("BUYER AGENT")).toBeInTheDocument();
  });

  it("renders seller assistant shell on /seller", () => {
    renderAt("/seller");
    expect(screen.getByRole("navigation", { name: "Assistant role" })).toBeInTheDocument();
    expect(screen.getByLabelText("Assistant workspace header")).toHaveTextContent(/Yield/);
    expect(screen.getByText("Supply assistant")).toBeInTheDocument();
    expect(screen.getByLabelText("Message to yield assistant")).toBeInTheDocument();
    expect(screen.getByText("Yield workspace")).toBeInTheDocument();
  });
});
