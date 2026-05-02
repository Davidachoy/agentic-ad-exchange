import type { ResolvedDecision, ReviewDecision } from "./atlasRightPanelTypes.js";

export interface MockSsp {
  id: string;
  name: string;
  enabled: boolean;
  warnLowWinRate?: boolean;
}

export interface MockPmp {
  id: string;
  label: string;
  status: "active" | "draft";
}

export interface PacingBar {
  name: string;
  pct: number;
  label: string;
}

export interface AnalyzeChannelRow {
  channel: string;
  imps: string;
  winPct: string;
  vcr: string;
  ecpm: string;
  vsGoal: string;
  tone: "beat" | "track" | "miss";
}

export const MOCK_SSPS: MockSsp[] = [
  { id: "hulu", name: "Hulu", enabled: true },
  { id: "roku", name: "Roku", enabled: true },
  { id: "meridian", name: "Meridian", enabled: true },
  { id: "tubi", name: "Tubi", enabled: false, warnLowWinRate: true },
];

export const MOCK_PMPS: MockPmp[] = [
  { id: "PMP-2298", label: "Northwave", status: "active" },
  { id: "PMP-1043", label: "Coastal", status: "draft" },
];

export const MOCK_PACING: PacingBar[] = [
  { name: "Hulu", pct: 68, label: "on-track" },
  { name: "Roku", pct: 28, label: "shifted" },
  { name: "Meridian", pct: 73, label: "on-track" },
  { name: "Tubi", pct: 22, label: "paused" },
];

export const MOCK_ANALYZE_ROWS: AnalyzeChannelRow[] = [
  { channel: "Hulu", imps: "2.1M", winPct: "64%", vcr: "94%", ecpm: "$18.20", vsGoal: "+2.1%", tone: "beat" },
  { channel: "Roku", imps: "890k", winPct: "58%", vcr: "88%", ecpm: "$16.40", vsGoal: "−0.4%", tone: "track" },
  { channel: "Tubi", imps: "120k", winPct: "22%", vcr: "71%", ecpm: "$22.10", vsGoal: "−8.2%", tone: "miss" },
];

export type CreativeRotation = "auto_vcr" | "auto_ctr" | "ab" | "manual";

export const CREATIVE_ROTATION_LABELS: Record<CreativeRotation, string> = {
  auto_vcr: "Auto VCR",
  auto_ctr: "Auto CTR",
  ab: "A/B test",
  manual: "Manual",
};

export const INITIAL_REVIEW_DECISIONS: ReviewDecision[] = [
  {
    id: "rev-1",
    tag: "NEGO",
    title: "Floor CPM lift — Coastal PMP",
    summary: "Seller counter at $19.20 vs Atlas $18.40 anchor.",
    age: "12m",
    context: "PMP-1043 Coastal is in draft renewal; counterpart proposed a +4% floor for Q3 flight overlap.",
    reasoning: [
      "Historical win rate 61% on this deal above $18 CPM.",
      "Spend pacing is 2% under target with 6 days left in flight.",
      "Accepting preserves fill; rejecting risks 48h re-auction delay.",
    ],
    impact: "≈ +$640 incremental spend if accepted; margin compression ~0.3 pts.",
    primaryLabel: "Accept $19.20",
    secondaryLabel: "Counter $18.80",
    dangerLabel: "Walk away",
  },
  {
    id: "rev-2",
    tag: "DECISION",
    title: "Shift 15% budget to Roku",
    summary: "VCR on Roku +8% vs goal; Hulu flat.",
    age: "26m",
    context: "Solstice 1P line item: Atlas recommends intra-week budget shift capped by policy delta.",
    reasoning: [
      "Roku segment VCR 96% vs 88% benchmark.",
      "Policy allows $4.8k/day autonomous delta — this move is $3.1k/day.",
      "No creative fatigue flags on Roku rotation.",
    ],
    impact: "Projected +$210 net vs benchmark over 4 days.",
    primaryLabel: "Approve shift",
    secondaryLabel: "Defer 24h",
    dangerLabel: "Reject",
  },
];

export const INITIAL_RESOLVED_HISTORY: ResolvedDecision[] = [
  { id: "h1", title: "Approve weekend bid cap extension", approved: true },
  { id: "h2", title: "Decline off-deal inventory bundle", approved: false },
];
