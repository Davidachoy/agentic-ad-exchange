import type { JSX } from "react";
import { Fragment, useState } from "react";

import type { CreativeRotation } from "./atlasMockCampaign.js";
import { CREATIVE_ROTATION_LABELS, MOCK_PMPS } from "./atlasMockCampaign.js";
import type { ParsedChip, ChipKey } from "./parseObjectiveChips.js";

export interface AtlasCreateModeProps {
  step: 1 | 2 | 3;
  onStep: (s: 1 | 2 | 3) => void;
  objectiveText: string;
  onObjectiveText: (t: string) => void;
  parsedChips: ParsedChip[];
  ssps: { id: string; name: string; enabled: boolean; warnLowWinRate?: boolean }[];
  onToggleSsp: (id: string) => void;
  dealsOpen: boolean;
  onDealsOpen: (v: boolean) => void;
  maxCpm: number;
  onMaxCpm: (n: number) => void;
  dailyDelta: number;
  onDailyDelta: (n: number) => void;
  approvalGate: number;
  onApprovalGate: (n: number) => void;
  rotation: CreativeRotation;
  onRotation: (r: CreativeRotation) => void;
  policySummary: string;
  onLaunch: () => void;
  onSaveDraft: () => void;
}

export function AtlasCreateMode({
  step,
  onStep,
  objectiveText,
  onObjectiveText,
  parsedChips,
  ssps,
  onToggleSsp,
  dealsOpen,
  onDealsOpen,
  maxCpm,
  onMaxCpm,
  dailyDelta,
  onDailyDelta,
  approvalGate,
  onApprovalGate,
  rotation,
  onRotation,
  policySummary,
  onLaunch,
  onSaveDraft,
}: AtlasCreateModeProps): JSX.Element {
  const [expandChip, setExpandChip] = useState<ChipKey | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border border-[oklch(0.91_0.005_80)] bg-[oklch(0.99_0.004_80)] p-1">
        {([1, 2, 3] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onStep(s)}
            className={`flex-1 rounded-md py-1.5 text-center font-atlas-mono text-[10.5px] font-semibold uppercase tracking-wide ${
              step === s ? "bg-white text-[oklch(0.18_0.01_80)] shadow-sm" : "text-[oklch(0.5_0.01_80)]"
            }`}
          >
            {s === 1 ? "Objective" : s === 2 ? "Inventory" : "Policy"}
          </button>
        ))}
      </div>

      {step === 1 ? (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block font-atlas-mono text-[9.5px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
              Objective
            </span>
            <textarea
              value={objectiveText}
              onChange={(e) => onObjectiveText(e.target.value)}
              rows={5}
              placeholder="Tell Atlas what you want to achieve..."
              className="w-full resize-y rounded-lg border border-[oklch(0.91_0.005_80)] bg-white px-3 py-2 text-[13px] text-[oklch(0.22_0.01_80)] outline-none ring-emerald-500/30 focus:ring-2"
            />
          </label>
          <div>
            <div className="font-atlas-mono text-[9.5px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
              Parsed
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {parsedChips.map((c) => (
                <Fragment key={c.key}>
                  <button
                    type="button"
                    onClick={() => setExpandChip((k) => (k === c.key ? null : c.key))}
                    className={`rounded-full border px-2.5 py-1 font-atlas-mono text-[11px] font-medium ${
                      c.status === "confirmed"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                        : "border-amber-200 bg-amber-50 text-amber-950"
                    }`}
                  >
                    {c.label}: {c.value}
                    {c.status === "ambiguous" ? " ?" : ""}
                  </button>
                  {expandChip === c.key ? (
                    <div className="w-full basis-full rounded-lg border border-[oklch(0.91_0.005_80)] bg-white p-2">
                      <input
                        type="text"
                        defaultValue={c.value}
                        className="w-full rounded border border-[oklch(0.91_0.005_80)] px-2 py-1 text-[12.5px]"
                        aria-label={`Edit ${c.label}`}
                      />
                    </div>
                  ) : null}
                </Fragment>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onStep(2)}
            className="w-full rounded-lg bg-[oklch(0.18_0.01_80)] py-2.5 text-[13px] font-semibold text-white hover:bg-[oklch(0.28_0.015_80)]"
          >
            Next: Inventory →
          </button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <ul className="list-none space-y-2 p-0">
            {ssps.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-[oklch(0.91_0.005_80)] bg-white px-3 py-2.5"
              >
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-[oklch(0.22_0.01_80)]">{s.name}</span>
                  {s.warnLowWinRate ? (
                    <span className="mt-0.5 font-atlas-mono text-[10px] font-medium text-amber-800">
                      Low win-rate recently
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.enabled}
                  onClick={() => onToggleSsp(s.id)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    s.enabled ? "bg-emerald-600" : "bg-[oklch(0.88_0.01_80)]"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      s.enabled ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </li>
            ))}
          </ul>
          <div className="rounded-lg border border-[oklch(0.91_0.005_80)] bg-white">
            <button
              type="button"
              onClick={() => onDealsOpen(!dealsOpen)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left font-atlas-mono text-[10px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]"
            >
              Deals / PMPs
              <span>{dealsOpen ? "−" : "+"}</span>
            </button>
            {dealsOpen ? (
              <ul className="list-none space-y-1 border-t border-[oklch(0.94_0.004_80)] p-3">
                {MOCK_PMPS.map((p) => (
                  <li key={p.id} className="font-atlas-mono text-[11.5px] text-[oklch(0.32_0.01_80)]">
                    {p.id} {p.label}{" "}
                    <span className={p.status === "active" ? "text-emerald-700" : "text-amber-800"}>
                      [{p.status}]
                    </span>
                  </li>
                ))}
                <li>
                  <button type="button" className="text-[11.5px] font-medium text-[oklch(0.36_0.01_80)] underline">
                    + Add deal ID
                  </button>
                </li>
              </ul>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onStep(1)}
              className="rounded-lg border border-[oklch(0.91_0.005_80)] bg-white px-3 py-2 text-[12.5px]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => onStep(3)}
              className="flex-1 rounded-lg bg-[oklch(0.18_0.01_80)] py-2.5 text-[13px] font-semibold text-white"
            >
              Next: Policy →
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <LabeledSlider
            label="Max bid CPM"
            min={1}
            max={30}
            value={maxCpm}
            onChange={onMaxCpm}
            format={(n) => `$${n.toFixed(2)}`}
          />
          <LabeledSlider
            label="Daily delta (auto, no approval)"
            min={1000}
            max={20000}
            step={100}
            value={dailyDelta}
            onChange={onDailyDelta}
            format={(n) => `$${(n / 1000).toFixed(1)}k`}
          />
          <label className="block">
            <span className="mb-1 block font-atlas-mono text-[9.5px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
              Approval gate ($/day)
            </span>
            <input
              type="number"
              min={1000}
              max={50000}
              step={100}
              value={approvalGate}
              onChange={(e) => onApprovalGate(Number(e.target.value))}
              className="w-full rounded-lg border border-[oklch(0.91_0.005_80)] px-3 py-2 font-atlas-mono text-[13px]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-atlas-mono text-[9.5px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
              Creative rotation
            </span>
            <select
              value={rotation}
              onChange={(e) => onRotation(e.target.value as CreativeRotation)}
              className="w-full rounded-lg border border-[oklch(0.91_0.005_80)] bg-white px-3 py-2 text-[13px]"
            >
              {(Object.keys(CREATIVE_ROTATION_LABELS) as CreativeRotation[]).map((k) => (
                <option key={k} value={k}>
                  {CREATIVE_ROTATION_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-[10px] border border-[oklch(0.91_0.005_80)] bg-[oklch(0.99_0.004_80)] p-3">
            <div className="font-atlas-mono text-[9.5px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
              Policy summary
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[oklch(0.28_0.01_80)]">{policySummary}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onLaunch}
              className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-[13px] font-semibold text-white hover:bg-emerald-700"
            >
              Launch campaign →
            </button>
            <button
              type="button"
              onClick={onSaveDraft}
              className="rounded-lg border border-[oklch(0.91_0.005_80)] bg-white px-4 py-2.5 text-[13px] font-medium"
            >
              Save as draft
            </button>
          </div>
          <button type="button" onClick={() => onStep(2)} className="text-[12.5px] text-[oklch(0.45_0.01_80)]">
            ← Back to inventory
          </button>
        </div>
      ) : null}
    </div>
  );
}

function LabeledSlider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  format,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (n: number) => void;
  format: (n: number) => string;
}): JSX.Element {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between font-atlas-mono text-[9.5px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.006_80)]">
        <span>{label}</span>
        <span className="text-[oklch(0.22_0.01_80)]">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-600"
      />
    </label>
  );
}
