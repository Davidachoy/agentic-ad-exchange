export type YieldPanelMode = "revenue" | "floors" | "deals" | "buyers";

export type YieldRevenuePeriod = "today" | "7d" | "total" | "custom";

export type DealStatus = "active" | "draft" | "negotiating";

export type BuyerAllowStatus = "allowed" | "blocked" | "preferred";

export interface YieldDealRow {
  id: string;
  name: string;
  status: DealStatus;
  cpm: string;
  duration: string;
  impsPerMo: string;
  buyer: string;
}

export interface YieldFloorRow {
  id: string;
  placement: string;
  floor: string;
  fillPct: string;
  signal: "calibrated" | "too_high" | "too_low";
  hint: string;
}

export interface YieldBuyerRow {
  id: string;
  name: string;
  winsToday: string;
  avgCpm: string;
  pctRevenue: string;
  status: BuyerAllowStatus;
}
