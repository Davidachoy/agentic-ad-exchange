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

  it("renders Atlas assistant shell on /atlas", () => {
    renderAt("/atlas");
    expect(screen.getByRole("navigation", { name: "Workspace" })).toBeInTheDocument();
    expect(screen.getByLabelText("Message to Atlas")).toBeInTheDocument();
  });
});
