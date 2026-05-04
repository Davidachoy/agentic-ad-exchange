import { useCallback, useEffect, useMemo, useState } from "react";

import type { CreativeRotation } from "./atlasMockCampaign.js";
import {
  INITIAL_RESOLVED_HISTORY,
  INITIAL_REVIEW_DECISIONS,
  MOCK_SSPS,
} from "./atlasMockCampaign.js";
import { parseObjectiveToChips } from "./parseObjectiveChips.js";
import type {
  AtlasException,
  AtlasPanelMode,
  AnalyzePeriod,
  ResolvedDecision,
  ReviewDecision,
} from "./atlasRightPanelTypes.js";

const OBJECTIVE_PREFILL =
  "Maximize VCR for Solstice 1P audience on CTV, $50k weekly cap, run through Sunday";

export interface UseAtlasRightPanelStateResult {
  activeMode: AtlasPanelMode;
  setActiveMode: (m: AtlasPanelMode) => void;
  createStep: 1 | 2 | 3;
  setCreateStep: (s: 1 | 2 | 3) => void;
  objectiveText: string;
  setObjectiveText: (t: string) => void;
  parsedChips: ReturnType<typeof parseObjectiveToChips>;
  ssps: typeof MOCK_SSPS;
  toggleSsp: (id: string) => void;
  dealsOpen: boolean;
  setDealsOpen: (v: boolean) => void;
  maxCpm: number;
  setMaxCpm: (n: number) => void;
  dailyDelta: number;
  setDailyDelta: (n: number) => void;
  approvalGate: number;
  setApprovalGate: (n: number) => void;
  rotation: CreativeRotation;
  setRotation: (r: CreativeRotation) => void;
  policySummary: string;
  exceptions: AtlasException[];
  showAllExceptions: boolean;
  setShowAllExceptions: (v: boolean) => void;
  metricsTick: number;
  panelEntering: boolean;
  exchangePulseOpen: boolean;
  setExchangePulseOpen: (v: boolean) => void;
  pendingDecisions: ReviewDecision[];
  resolvedHistory: ResolvedDecision[];
  expandedReviewId: string | null;
  setExpandedReviewId: (id: string | null) => void;
  dontAskAgain: Record<string, boolean>;
  setDontAskAgain: (id: string, v: boolean) => void;
  exitingDecisionIds: Set<string>;
  launchCampaign: () => void;
  saveDraft: () => void;
  resolveDecision: (id: string, approved: boolean) => void;
  analyzePeriod: AnalyzePeriod;
  setAnalyzePeriod: (p: AnalyzePeriod) => void;
  applyNext: Record<string, boolean>;
  setApplyNext: (key: string, v: boolean) => void;
  autoExecutedToday: number;
  totalDecisionsToday: number;
  settledDisplay: string;
  winRateDisplay: string;
  burnDisplay: string;
  savedDisplay: string;
}

export function useAtlasRightPanelState(): UseAtlasRightPanelStateResult {
  const [activeMode, setActiveMode] = useState<AtlasPanelMode>("monitor");
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
  const [objectiveText, setObjectiveText] = useState(OBJECTIVE_PREFILL);
  const [ssps, setSsps] = useState(() => MOCK_SSPS.map((s) => ({ ...s })));
  const [dealsOpen, setDealsOpen] = useState(false);
  const [maxCpm, setMaxCpm] = useState(20);
  const [dailyDelta, setDailyDelta] = useState(4800);
  const [approvalGate, setApprovalGate] = useState(5000);
  const [rotation, setRotation] = useState<CreativeRotation>("auto_vcr");
  const [exceptions, setExceptions] = useState<AtlasException[]>([]);
  const [showAllExceptions, setShowAllExceptions] = useState(false);
  const [metricsTick, setMetricsTick] = useState(0);
  const [panelEntering, setPanelEntering] = useState(false);
  const [exchangePulseOpen, setExchangePulseOpen] = useState(true);
  const [pendingDecisions, setPendingDecisions] = useState<ReviewDecision[]>(() => [
    ...INITIAL_REVIEW_DECISIONS,
  ]);
  const [resolvedHistory, setResolvedHistory] = useState<ResolvedDecision[]>(() => [
    ...INITIAL_RESOLVED_HISTORY,
  ]);
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);
  const [dontAskAgain, setDontAskAgainMap] = useState<Record<string, boolean>>({});
  const [exitingDecisionIds, setExitingDecisionIds] = useState(() => new Set<string>());
  const [analyzePeriod, setAnalyzePeriod] = useState<AnalyzePeriod>("today");
  const [applyNext, setApplyNextState] = useState({
    pacing: false,
    policy: false,
    creative: false,
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      setMetricsTick((n) => n + 1);
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const parsedChips = useMemo(() => parseObjectiveToChips(objectiveText), [objectiveText]);

  const policySummary = useMemo(() => {
    const cpm = maxCpm.toFixed(2);
    const deltaK = (dailyDelta / 1000).toFixed(1);
    const gateK = (approvalGate / 1000).toFixed(0);
    return `Atlas will bid up to $${cpm} CPM, shift up to $${deltaK}k/day autonomously, and ask for approval on decisions over $${gateK}k/day.`;
  }, [maxCpm, dailyDelta, approvalGate]);

  const baseAuto = 410;
  const baseTotal = 412;
  const autoExecutedToday = baseAuto + (metricsTick % 3);
  const totalDecisionsToday = baseTotal + (metricsTick % 2);
  const settledDisplay = `$${184 + (metricsTick % 2)}k`;
  const winRateDisplay = `${(63.1 + (metricsTick % 2) * 0.05).toFixed(1)}%`;
  const burnDisplay = `$${4.6 + (metricsTick % 2) * 0.1}k`;
  const savedDisplay = `+$${1284 + metricsTick * 3}`;

  const toggleSsp = useCallback((id: string) => {
    setSsps((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  }, []);

  const setDontAskAgain = useCallback((id: string, v: boolean) => {
    setDontAskAgainMap((m) => ({ ...m, [id]: v }));
  }, []);

  const setApplyNext = useCallback((key: string, v: boolean) => {
    setApplyNextState((s) => ({ ...s, [key]: v }));
  }, []);

  const launchCampaign = useCallback(() => {
    setPanelEntering(true);
    window.setTimeout(() => {
      setActiveMode("monitor");
      setCreateStep(1);
      setPanelEntering(false);
      setExceptions((prev) => [
        {
          id: `launch-${Date.now()}`,
          severity: "success",
          title: "Campaign launched",
          context: "Atlas is now live",
          actionLabel: "View pacing",
          pulse: true,
        },
        ...prev,
      ]);
    }, 280);
  }, []);

  const saveDraft = useCallback(() => {
    setActiveMode("monitor");
    setCreateStep(1);
  }, []);

  const resolveDecision = useCallback((id: string, approved: boolean) => {
    const dec = pendingDecisions.find((d) => d.id === id);
    if (!dec) return;
    setExitingDecisionIds((s) => new Set(s).add(id));
    window.setTimeout(() => {
      setPendingDecisions((list) => list.filter((d) => d.id !== id));
      setResolvedHistory((h) => [{ id: `res-${id}`, title: dec.title, approved }, ...h]);
      setExitingDecisionIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
      setExpandedReviewId(null);
    }, 320);
  }, [pendingDecisions]);

  return {
    activeMode,
    setActiveMode,
    createStep,
    setCreateStep,
    objectiveText,
    setObjectiveText,
    parsedChips,
    ssps,
    toggleSsp,
    dealsOpen,
    setDealsOpen,
    maxCpm,
    setMaxCpm,
    dailyDelta,
    setDailyDelta,
    approvalGate,
    setApprovalGate,
    rotation,
    setRotation,
    policySummary,
    exceptions,
    showAllExceptions,
    setShowAllExceptions,
    metricsTick,
    panelEntering,
    exchangePulseOpen,
    setExchangePulseOpen,
    pendingDecisions,
    resolvedHistory,
    expandedReviewId,
    setExpandedReviewId,
    dontAskAgain,
    setDontAskAgain,
    exitingDecisionIds,
    launchCampaign,
    saveDraft,
    resolveDecision,
    analyzePeriod,
    setAnalyzePeriod,
    applyNext,
    setApplyNext,
    autoExecutedToday,
    totalDecisionsToday,
    settledDisplay,
    winRateDisplay,
    burnDisplay,
    savedDisplay,
  };
}
