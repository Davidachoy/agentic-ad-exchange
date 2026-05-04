export type ChipKey = "goal" | "budget" | "audience" | "flight" | "channel";

export interface ParsedChip {
  key: ChipKey;
  label: string;
  value: string;
  status: "confirmed" | "ambiguous";
}

const EXAMPLE =
  "Maximize VCR for Solstice 1P audience on CTV, $50k weekly cap, run through Sunday";

export function parseObjectiveToChips(text: string): ParsedChip[] {
  const t = text.trim();
  if (t.length === 0) {
    return [];
  }

  const chips: ParsedChip[] = [];
  const lower = t.toLowerCase();

  if (/\bvcr\b|maximize|objective|goal/i.test(t)) {
    chips.push({
      key: "goal",
      label: "Goal",
      value: /maximize/i.test(t) ? "Maximize VCR" : "Optimize VCR",
      status: lower.includes("vcr") && lower.includes("maximize") ? "confirmed" : "ambiguous",
    });
  } else {
    chips.push({ key: "goal", label: "Goal", value: "—", status: "ambiguous" });
  }

  const budgetMatch = t.match(/\$[\d,]+k?\s*(weekly|\/wk|cap|total)?/i);
  chips.push({
    key: "budget",
    label: "Budget",
    value: budgetMatch ? budgetMatch[0].replace(/\s+/g, " ") : "$50k weekly cap",
    status: budgetMatch ? "confirmed" : "ambiguous",
  });

  if (/solstice|1p|audience|demo|household/i.test(t)) {
    chips.push({
      key: "audience",
      label: "Audience",
      value: /solstice/i.test(t) ? "Solstice 1P" : "CTV audience",
      status: /solstice|1p/i.test(t) ? "confirmed" : "ambiguous",
    });
  } else {
    chips.push({ key: "audience", label: "Audience", value: "—", status: "ambiguous" });
  }

  if (/through|until|mon|tue|wed|thu|fri|sat|sun|week/i.test(t)) {
    chips.push({
      key: "flight",
      label: "Flight",
      value: /sunday/i.test(lower) ? "Run through Sunday" : "Flight TBD",
      status: /sunday|through/i.test(lower) ? "confirmed" : "ambiguous",
    });
  } else {
    chips.push({ key: "flight", label: "Flight", value: "—", status: "ambiguous" });
  }

  chips.push({
    key: "channel",
    label: "Channel",
    value: /\bctv\b|connected/i.test(lower) ? "CTV" : "Multi-channel",
    status: /\bctv\b/i.test(lower) ? "confirmed" : "ambiguous",
  });

  if (t === EXAMPLE || t.includes("Solstice") && t.includes("50k")) {
    return [
      { key: "goal", label: "Goal", value: "Maximize VCR", status: "confirmed" },
      { key: "budget", label: "Budget", value: "$50k weekly cap", status: "confirmed" },
      { key: "audience", label: "Audience", value: "Solstice 1P", status: "confirmed" },
      { key: "flight", label: "Flight", value: "Through Sunday", status: "confirmed" },
      { key: "channel", label: "Channel", value: "CTV", status: "confirmed" },
    ];
  }

  return chips;
}
