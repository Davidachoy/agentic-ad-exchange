import type { AssistantBarChartBlock } from "@ade/shared";
import type { JSX } from "react";

const CHART_H_PX = 152;

function formatTick(n: number): string {
  if (Number.isInteger(n)) {
    return String(n);
  }
  return n.toFixed(1);
}

export function AtlasBarChartBlock({ block }: { block: AssistantBarChartBlock }): JSX.Element {
  const maxVal = Math.max(...block.points.map((p) => p.value), 0);
  const allZero = maxVal === 0;
  const scaleMax = allZero ? 1 : maxVal;
  const ariaParts = block.points.map((p) => `${p.label}: ${formatTick(p.value)}`);
  const ariaLabel = `${block.title}. ${ariaParts.join(", ")}`;

  return (
    <figure
      className="overflow-hidden rounded-[10px] border border-[oklch(0.91_0.005_80)] bg-white shadow-sm"
      aria-label={ariaLabel}
    >
      <figcaption className="border-b border-[oklch(0.94_0.004_80)] px-3 py-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="font-atlas-mono text-[9px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
              Chart
            </div>
            <h3 className="mt-0.5 text-[13px] font-semibold text-[oklch(0.18_0.01_80)]">{block.title}</h3>
            {block.subtitle != null && block.subtitle.length > 0 ? (
              <p className="mt-0.5 text-[11.5px] leading-snug text-[oklch(0.45_0.01_80)]">{block.subtitle}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {block.dataSource === "simulated" ? (
              <span
                className="rounded bg-amber-50 px-1.5 py-0.5 font-atlas-mono text-[8px] font-medium uppercase text-amber-900"
                title="Illustrative demo series"
              >
                sim
              </span>
            ) : (
              <span className="rounded border border-[oklch(0.91_0.005_80)] bg-[oklch(0.97_0.005_80)] px-1.5 py-0.5 font-atlas-mono text-[8px] font-medium uppercase text-[oklch(0.42_0.01_80)]">
                exchange
              </span>
            )}
            {block.yCaption != null && block.yCaption.length > 0 ? (
              <span className="font-atlas-mono text-[9px] text-[oklch(0.55_0.006_80)]">{block.yCaption}</span>
            ) : null}
          </div>
        </div>
      </figcaption>
      <div className="px-2 pb-2 pt-3 sm:px-3">
        {allZero ? (
          <p className="py-6 text-center text-[12.5px] leading-relaxed text-[oklch(0.48_0.01_80)]">
            All plotted values are zero, so there is nothing to compare by height.
          </p>
        ) : (
          <div
            className="flex items-end justify-between gap-1 sm:gap-1.5"
            style={{ height: CHART_H_PX }}
            role="presentation"
          >
            {block.points.map((p, i) => {
              const ratio = scaleMax > 0 ? p.value / scaleMax : 0;
              const barH = Math.max(ratio * CHART_H_PX, p.value > 0 ? 6 : 3);
              return (
                <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <div
                    className="w-full max-w-[44px] rounded-t-md bg-[oklch(0.72_0.12_230)] sm:max-w-[52px]"
                    style={{ height: barH }}
                    title={`${p.label}: ${formatTick(p.value)}`}
                  />
                  <span className="line-clamp-2 w-full text-center font-atlas-mono text-[9px] leading-tight text-[oklch(0.42_0.01_80)]">
                    {p.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </figure>
  );
}
