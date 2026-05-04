import type { AssistantUiBlock } from "@ade/shared";
import type { JSX } from "react";

import { AtlasBarChartBlock } from "./AtlasBarChartBlock.js";
import { renderBoldMarkdown } from "./inlineBold.js";

export interface AtlasAssistantBlocksProps {
  blocks: AssistantUiBlock[];
}

export function AtlasAssistantBlocks({ blocks }: AtlasAssistantBlocksProps): JSX.Element {
  return (
    <div className="mt-2.5 space-y-2.5" aria-label="Structured assistant content">
      {blocks.map((block, idx) => (
        <div key={idx}>{renderBlock(block)}</div>
      ))}
    </div>
  );
}

function renderBlock(block: AssistantUiBlock): JSX.Element {
  switch (block.type) {
    case "metrics_strip":
      return <MetricsStripBlock block={block} />;
    case "pill_group":
      return <PillGroupBlock block={block} />;
    case "decision":
      return <DecisionBlock block={block} />;
    case "bar_chart":
      return <AtlasBarChartBlock block={block} />;
  }
}

function MetricsStripBlock({ block }: { block: Extract<AssistantUiBlock, { type: "metrics_strip" }> }): JSX.Element {
  return (
    <div className="overflow-hidden rounded-[10px] border border-[oklch(0.91_0.005_80)] bg-white shadow-sm">
      <div className="grid grid-cols-2 gap-0 border-b border-[oklch(0.94_0.004_80)] sm:grid-cols-4">
        {block.items.map((item, i) => (
          <div
            key={i}
            className="border-r border-[oklch(0.94_0.004_80)] px-3 py-2.5 last:border-r-0 sm:border-r"
          >
            <div className="flex items-center gap-1.5">
              <span className="font-atlas-mono text-[9px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
                {item.label}
              </span>
              {item.dataSource === "simulated" ? (
                <span
                  className="rounded bg-amber-50 px-1 py-0 font-atlas-mono text-[8px] font-medium uppercase text-amber-900"
                  title="Illustrative demo metric"
                >
                  sim
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 font-atlas-mono text-[13px] font-semibold text-[oklch(0.18_0.01_80)]">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function pillClass(variant: "new" | "kept" | "neutral"): string {
  switch (variant) {
    case "new":
      return "border-emerald-200 bg-emerald-50 text-emerald-950";
    case "kept":
      return "border-[oklch(0.91_0.005_80)] bg-[oklch(0.97_0.005_80)] text-[oklch(0.32_0.01_80)]";
    default:
      return "border-[oklch(0.91_0.005_80)] bg-white text-[oklch(0.28_0.01_80)]";
  }
}

function PillGroupBlock({ block }: { block: Extract<AssistantUiBlock, { type: "pill_group" }> }): JSX.Element {
  return (
    <div className="rounded-[10px] border border-[oklch(0.91_0.005_80)] bg-white px-3 py-2.5 shadow-sm">
      <div className="font-atlas-mono text-[9px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
        {block.sectionTitle}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {block.pills.map((p, i) => (
          <span
            key={i}
            className={`inline-flex max-w-full rounded-full border px-2 py-0.5 font-atlas-mono text-[11px] leading-snug ${pillClass(p.variant)}`}
          >
            {p.text}
          </span>
        ))}
      </div>
    </div>
  );
}

function DecisionBlock({ block }: { block: Extract<AssistantUiBlock, { type: "decision" }> }): JSX.Element {
  return (
    <div className="overflow-hidden rounded-[10px] border border-[oklch(0.91_0.005_80)] bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[oklch(0.94_0.004_80)] px-3 py-2">
        <div>
          <div className="font-atlas-mono text-[9px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
            Decision
          </div>
          <h3 className="mt-0.5 text-[13px] font-semibold text-[oklch(0.18_0.01_80)]">{block.headline}</h3>
        </div>
        {block.badge ? (
          <span className="shrink-0 rounded-full border border-[oklch(0.91_0.005_80)] bg-[oklch(0.97_0.005_80)] px-2 py-0.5 font-atlas-mono text-[10px] text-[oklch(0.4_0.01_80)]">
            {block.badge}
          </span>
        ) : null}
      </div>
      <div className="space-y-2 px-3 py-2.5 text-[13px] leading-relaxed text-[oklch(0.28_0.01_80)]">
        <p>{renderBoldMarkdown(block.summary)}</p>
        {block.reasoning.length > 0 ? (
          <div>
            <div className="mb-1 font-atlas-mono text-[9px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
              Reasoning
            </div>
            <ol className="list-decimal space-y-1 pl-4">
              {block.reasoning.map((line, i) => (
                <li key={i}>{renderBoldMarkdown(line)}</li>
              ))}
            </ol>
          </div>
        ) : null}
        {block.rejected.length > 0 ? (
          <div>
            <div className="mb-1 font-atlas-mono text-[9px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
              Alternatives rejected
            </div>
            <ul className="space-y-1">
              {block.rejected.map((r, i) => (
                <li key={i} className="text-[12.5px]">
                  <span className="font-medium">{renderBoldMarkdown(r.action)}</span>
                  <span className="text-[oklch(0.5_0.01_80)]"> — {renderBoldMarkdown(r.reason)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {block.complianceNote ? (
          <p className="border-t border-[oklch(0.94_0.004_80)] pt-2 text-[12.5px] text-emerald-800">
            {renderBoldMarkdown(block.complianceNote)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
