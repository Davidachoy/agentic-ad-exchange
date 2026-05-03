import type { YieldBuyerRow, YieldDealRow, YieldFloorRow } from "./yieldPanelTypes.js";

export const YIELD_PLACEMENT_ROWS = [
  {
    placement: "Homepage 970×250",
    imps: "4.2M",
    fill: "84%",
    ecpm: "$2.14",
    revenue: "$1,840",
    vsFloor: "+0.8%",
    tone: "ok" as const,
  },
  {
    placement: "CTV pre-roll 30s",
    imps: "890k",
    fill: "34%",
    ecpm: "$4.20",
    revenue: "$1,240",
    vsFloor: "-18.2%",
    tone: "bad" as const,
  },
  {
    placement: "Mobile banner",
    imps: "2.1M",
    fill: "71%",
    ecpm: "$0.80",
    revenue: "$1,130",
    vsFloor: "-12.4%",
    tone: "warn" as const,
  },
];

export const YIELD_FLOOR_ROWS: YieldFloorRow[] = [
  {
    id: "f1",
    placement: "Homepage 970×250",
    floor: "$1.85",
    fillPct: "84%",
    signal: "calibrated",
    hint: "Yield agent: demand clears consistently above floor.",
  },
  {
    id: "f2",
    placement: "CTV pre-roll 30s",
    floor: "$4.20",
    fillPct: "34%",
    signal: "too_high",
    hint: "Try $3.20–$3.60 to recover fill without surrendering margin.",
  },
  {
    id: "f3",
    placement: "Mobile banner",
    floor: "$0.80",
    fillPct: "71%",
    signal: "too_low",
    hint: "Room to lift toward $1.00 if fill holds above 65%.",
  },
];

export const YIELD_DEAL_ROWS: YieldDealRow[] = [
  {
    id: "d1",
    name: "Northwave · Sports PMP",
    status: "active",
    cpm: "$4.80",
    duration: "30d",
    impsPerMo: "8.4M",
    buyer: "Northwave DSP",
  },
  {
    id: "d2",
    name: "Meridian direct · CTV",
    status: "negotiating",
    cpm: "$3.95",
    duration: "14d",
    impsPerMo: "2.1M",
    buyer: "Meridian 1P",
  },
  {
    id: "d3",
    name: "Hulu extension (draft)",
    status: "draft",
    cpm: "$3.20",
    duration: "7d",
    impsPerMo: "600k",
    buyer: "Hulu Ad Manager",
  },
];

export const YIELD_BUYER_ROWS: YieldBuyerRow[] = [
  { id: "b1", name: "Northwave DSP", winsToday: "412", avgCpm: "$2.31", pctRevenue: "38%", status: "preferred" },
  { id: "b2", name: "Trade Desk", winsToday: "301", avgCpm: "$1.98", pctRevenue: "22%", status: "allowed" },
  { id: "b3", name: "Solstice 1P", winsToday: "188", avgCpm: "$2.04", pctRevenue: "18%", status: "allowed" },
  { id: "b4", name: "OpenPath remnant", winsToday: "94", avgCpm: "$0.72", pctRevenue: "7%", status: "blocked" },
];
