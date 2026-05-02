import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AtlasMessageBubble } from "./AtlasMessageBubble.js";

describe("<AtlasMessageBubble />", () => {
  it("renders **wrapped** spans as bold (happy)", () => {
    render(
      <AtlasMessageBubble
        message={{
          id: "1",
          role: "assistant",
          content: "I'm **Atlas**, your assistant.",
          createdAt: new Date().toISOString(),
        }}
      />,
    );
    const strong = screen.getByText("Atlas", { selector: "strong" });
    expect(strong.tagName).toBe("STRONG");
    expect(screen.getByText(/I'm/)).toBeInTheDocument();
    expect(screen.getByText(/, your assistant\./)).toBeInTheDocument();
  });

  it("leaves a trailing unmatched ** as literal (edge)", () => {
    render(
      <AtlasMessageBubble
        message={{
          id: "2",
          role: "assistant",
          content: "no close **bold",
          createdAt: new Date().toISOString(),
        }}
      />,
    );
    expect(document.querySelector("strong")).toBeNull();
    expect(screen.getByText("no close **bold", { exact: false })).toBeInTheDocument();
  });

  it("renders assistant blocks when present (happy)", () => {
    render(
      <AtlasMessageBubble
        message={{
          id: "3",
          role: "assistant",
          content: "Snapshot:",
          createdAt: new Date().toISOString(),
          blocks: [
            {
              type: "metrics_strip",
              items: [{ label: "SSE", value: "live", dataSource: "exchange" }],
            },
          ],
        }}
      />,
    );
    expect(screen.getByLabelText("Structured assistant content")).toBeInTheDocument();
    expect(screen.getByText("live")).toBeInTheDocument();
  });

  it("shows demo preview badge when demoPreview is set (happy)", () => {
    render(
      <AtlasMessageBubble
        message={{
          id: "demo1",
          role: "assistant",
          content: "Demo reply.",
          createdAt: new Date().toISOString(),
          demoPreview: true,
        }}
      />,
    );
    expect(screen.getByText("demo preview")).toBeInTheDocument();
  });

  it("renders bar_chart block with figure caption (happy)", () => {
    render(
      <AtlasMessageBubble
        message={{
          id: "5",
          role: "assistant",
          content: "Visualización:",
          createdAt: new Date().toISOString(),
          blocks: [
            {
              type: "bar_chart",
              title: "Bids by buyer",
              dataSource: "exchange",
              points: [
                { label: "A", value: 3 },
                { label: "B", value: 1 },
              ],
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("Bids by buyer")).toBeInTheDocument();
    expect(screen.getByLabelText(/Bids by buyer/)).toBeInTheDocument();
  });

  it("shows goal tag and left accent for user goal composer messages (happy)", () => {
    render(
      <AtlasMessageBubble
        message={{
          id: "g1",
          role: "user",
          content: "Maximize reach",
          createdAt: new Date().toISOString(),
          userComposerMode: "goal",
        }}
      />,
    );
    expect(screen.getByText("Goal updated")).toBeInTheDocument();
  });

  it("shows policy tag for user policy composer messages (happy)", () => {
    render(
      <AtlasMessageBubble
        message={{
          id: "p1",
          role: "user",
          content: "Never bid above $15",
          createdAt: new Date().toISOString(),
          userComposerMode: "policy",
        }}
      />,
    );
    expect(screen.getByText("Policy added")).toBeInTheDocument();
  });

  it("does not render blocks for user messages (edge)", () => {
    render(
      <AtlasMessageBubble
        message={{
          id: "4",
          role: "user",
          content: "Hi",
          createdAt: new Date().toISOString(),
          blocks: [
            {
              type: "metrics_strip",
              items: [{ label: "X", value: "y", dataSource: "exchange" }],
            },
          ],
        }}
      />,
    );
    expect(screen.queryByLabelText("Structured assistant content")).toBeNull();
  });
});
