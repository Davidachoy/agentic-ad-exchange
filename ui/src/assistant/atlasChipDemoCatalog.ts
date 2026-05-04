import type { AssistantUiBlock } from "@ade/shared";

/** Suggestion chip labels — local demo replies only; typed messages still use POST /assistant/chat. */
export const ATLAS_CHIP_SUGGESTIONS = [
  "Summarize key metrics from the dashboard.",
  "Explain the last auction decision.",
  "What should I do next on the Exchange page?",
  "Show a bar chart of open bids by buyer agent (use dashboard data).",
] as const;

export type AtlasChipSuggestion = (typeof ATLAS_CHIP_SUGGESTIONS)[number];

export function isAtlasChipSuggestion(text: string): text is AtlasChipSuggestion {
  return (ATLAS_CHIP_SUGGESTIONS as readonly string[]).includes(text);
}

export interface AtlasChipDemoPayload {
  reply: string;
  blocks: AssistantUiBlock[];
}

export function getAtlasChipDemoReply(text: string): AtlasChipDemoPayload | null {
  if (!isAtlasChipSuggestion(text)) {
    return null;
  }
  switch (text) {
    case ATLAS_CHIP_SUGGESTIONS[0]:
      return {
        reply:
          "Here is a **sample metrics strip** and tag pills — illustrative numbers until the live assistant reads your session.",
        blocks: [
          {
            type: "metrics_strip",
            items: [
              { label: "SSE", value: "live", dataSource: "simulated" },
              { label: "Demo", value: "running", dataSource: "simulated" },
              { label: "Settlements", value: "12", dataSource: "simulated" },
              { label: "Open bids", value: "8", dataSource: "simulated" },
            ],
          },
          {
            type: "pill_group",
            sectionTitle: "Focus tags (demo)",
            pills: [
              { text: "sports · CTV", variant: "new" },
              { text: "finance · display", variant: "kept" },
              { text: "retail · native", variant: "neutral" },
            ],
          },
        ],
      };
    case ATLAS_CHIP_SUGGESTIONS[1]:
      return {
        reply:
          "Sample **decision explainer** card — second-price logic and tie-break rules are always computed server-side in production.",
        blocks: [
          {
            type: "decision",
            headline: "Award clearing slot to highest compliant bid",
            summary:
              "Winner pays the second-highest price; ties break on earliest bid receipt (demo copy — not your live auction).",
            reasoning: [
              "Floor price enforced before matching.",
              "Only bids inside the declared format/size are eligible.",
            ],
            rejected: [
              { action: "First-price sealed bid", reason: "Demo stack uses second-price for margin story." },
            ],
            badge: "demo",
            complianceNote: "Settlement still routes through Circle DCW + nanopayments in the real stack.",
          },
        ],
      };
    case ATLAS_CHIP_SUGGESTIONS[2]:
      return {
        reply:
          "Sample **next steps** — swap this list for live recommendations once the buyer agent is wired to your exchange state.",
        blocks: [
          {
            type: "pill_group",
            sectionTitle: "Suggested actions (demo)",
            pills: [
              { text: "Register a listing if inventory is empty", variant: "new" },
              { text: "Place 2–3 bids in different formats", variant: "neutral" },
              { text: "Run multi-agent auction from Exchange", variant: "kept" },
            ],
          },
        ],
      };
    case ATLAS_CHIP_SUGGESTIONS[3]:
      return {
        reply: "Here is a **dummy bar chart** of open bids by buyer agent — values are simulated for UI review.",
        blocks: [
          {
            type: "bar_chart",
            title: "Open bids by buyer (demo)",
            subtitle: "Illustrative USDC amounts — not read from your live buffer.",
            yCaption: "USDC (sim.)",
            dataSource: "simulated",
            points: [
              { label: "corp-a", value: 0.014 },
              { label: "corp-b", value: 0.011 },
              { label: "corp-c", value: 0.009 },
              { label: "corp-d", value: 0.007 },
            ],
          },
        ],
      };
    default:
      return null;
  }
}
