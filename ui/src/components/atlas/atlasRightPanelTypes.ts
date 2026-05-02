import type { ControlStateHandle } from "../../hooks/useControlState.js";

export type AtlasPanelMode = "monitor" | "create" | "review" | "analyze";

export type ExceptionSeverity = "warn" | "critical" | "success";

export interface AtlasException {
  id: string;
  severity: ExceptionSeverity;
  title: string;
  context: string;
  actionLabel: string;
  /** Pulsing green dot in header area for launch success */
  pulse?: boolean;
}

export interface ReviewDecision {
  id: string;
  tag: "NEGO" | "DECISION";
  title: string;
  summary: string;
  age: string;
  context: string;
  reasoning: string[];
  impact: string;
  primaryLabel: string;
  secondaryLabel: string;
  dangerLabel: string;
}

export interface ResolvedDecision {
  id: string;
  title: string;
  approved: boolean;
}

export type AnalyzePeriod = "today" | "7d" | "campaign" | "custom";

export interface AtlasRightPanelExchangeProps {
  connected: boolean;
  paused: boolean;
  settlementCount: number;
  bidCount: number;
  listingCount: number;
  lastAuction: import("@ade/shared").AuctionResult | null;
  lastReceipt: import("@ade/shared").SettlementReceipt | null;
}

export interface AtlasRightPanelControlProps {
  control: ControlStateHandle;
}
