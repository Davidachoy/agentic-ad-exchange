import type { JSX } from "react";

import type { AssistantComposerModeField } from "./AssistantModeComposer.js";

function svg(size: number): { width: number; height: number; viewBox: string; "aria-hidden": boolean } {
  return { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true as const };
}

function IconLayers(): JSX.Element {
  return (
    <svg {...svg(14)} className="text-current" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4L4 9l8 5 8-5-8-5zM4 14l8 5 8-5M4 19l8 5 8-5" />
    </svg>
  );
}

function IconHandshake(): JSX.Element {
  return (
    <svg {...svg(14)} className="text-current" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" d="M8 12l2 2 4-4M8 12H6a2 2 0 00-2 2v1h3M8 12V9a2 2 0 012-2h2l3 3M16 12h2a2 2 0 012 2v1h-3M16 12V9a2 2 0 00-2-2h-2" />
    </svg>
  );
}

function IconStop(): JSX.Element {
  return (
    <svg {...svg(14)} className="text-current" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  );
}

function IconChart(): JSX.Element {
  return (
    <svg {...svg(14)} className="text-current" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" d="M4 19V5M8 19v-6M12 19V9M16 19v-4M20 19V11" />
    </svg>
  );
}

/** Left-to-right: primary pricing control → read-only insight → commercial → restrictive (last). */
export const SELLER_COMPOSER_MODES: readonly AssistantComposerModeField[] = [
  {
    id: "set_floor",
    label: "Set floor",
    placeholder: "Which placement and what floor? e.g. Set CTV pre-roll floor to $3.20...",
    hint: "Fill & revenue preview before confirm",
    pillOnClassName: "atlas-composer-pill--on",
  },
  {
    id: "analyze",
    label: "Analyze",
    placeholder: "Ask about your inventory performance. e.g. Why did revenue drop yesterday?...",
    hint: "Fill, floors, buyers & deals",
    pillOnClassName: "atlas-composer-pill--on",
  },
  {
    id: "configure_deal",
    label: "Configure deal",
    placeholder: "Describe the deal. e.g. 30-day exclusive with Northwave at $4.80 CPM...",
    hint: "PMP draft — confirm to activate",
    pillOnClassName: "atlas-composer-pill--on",
  },
  {
    id: "block_buyer",
    label: "Block buyer",
    placeholder: "Which buyer and which placements? e.g. Block Trade Desk from homepage...",
    hint: "Revenue impact preview before block",
    pillOnClassName: "atlas-composer-pill--on",
  },
];

export function renderSellerComposerIcon(modeId: string): JSX.Element {
  if (modeId === "configure_deal") {
    return <IconHandshake />;
  }
  if (modeId === "block_buyer") {
    return <IconStop />;
  }
  if (modeId === "analyze") {
    return <IconChart />;
  }
  return <IconLayers />;
}
