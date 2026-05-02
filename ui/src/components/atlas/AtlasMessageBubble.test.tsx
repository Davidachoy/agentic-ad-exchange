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
});
