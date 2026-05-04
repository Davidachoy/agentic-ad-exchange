import { useCallback, useState } from "react";

import { YIELD_BUYER_ROWS, YIELD_DEAL_ROWS, YIELD_FLOOR_ROWS } from "./sellerYieldConstants.js";
import type {
  BuyerAllowStatus,
  YieldBuyerRow,
  YieldDealRow,
  YieldFloorRow,
  YieldPanelMode,
  YieldRevenuePeriod,
} from "./yieldPanelTypes.js";

export interface UseSellerYieldPanelStateResult {
  activeMode: YieldPanelMode;
  setActiveMode: (m: YieldPanelMode) => void;
  panelEntering: boolean;
  revenuePeriod: YieldRevenuePeriod;
  setRevenuePeriod: (p: YieldRevenuePeriod) => void;
  applyFlight: Record<string, boolean>;
  setApplyFlight: (key: string, v: boolean) => void;
  expandedDealIds: Set<string>;
  toggleDealExpanded: (id: string) => void;
  floorRows: YieldFloorRow[];
  floorDrafts: Record<string, string>;
  setFloorDraft: (id: string, v: string) => void;
  commitFloorDraft: (id: string) => void;
  editingFloorId: string | null;
  setEditingFloorId: (id: string | null) => void;
  buyers: YieldBuyerRow[];
  cycleBuyerStatus: (id: string) => void;
  deals: YieldDealRow[];
}

export function useSellerYieldPanelState(): UseSellerYieldPanelStateResult {
  const [activeMode, setActiveModeState] = useState<YieldPanelMode>("revenue");
  const [panelEntering, setPanelEntering] = useState(false);
  const [revenuePeriod, setRevenuePeriod] = useState<YieldRevenuePeriod>("today");
  const [applyFlight, setApplyFlightState] = useState<Record<string, boolean>>({
    ctv: false,
    mobile: false,
    homepage: false,
  });
  const [expandedDealIds, setExpandedDealIds] = useState<Set<string>>(new Set());
  const [floorRows, setFloorRows] = useState<YieldFloorRow[]>(() => [...YIELD_FLOOR_ROWS]);
  const [floorDrafts, setFloorDrafts] = useState<Record<string, string>>({});
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [buyers, setBuyers] = useState(() => [...YIELD_BUYER_ROWS]);
  const [deals] = useState<YieldDealRow[]>(() => [...YIELD_DEAL_ROWS]);

  const setActiveMode = useCallback((m: YieldPanelMode) => {
    if (m === activeMode) {
      return;
    }
    setPanelEntering(true);
    setActiveModeState(m);
    window.setTimeout(() => setPanelEntering(false), 120);
  }, [activeMode]);

  const setApplyFlight = useCallback((key: string, v: boolean) => {
    setApplyFlightState((prev) => ({ ...prev, [key]: v }));
  }, []);

  const toggleDealExpanded = useCallback((id: string) => {
    setExpandedDealIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const setFloorDraft = useCallback((id: string, v: string) => {
    setFloorDrafts((prev) => ({ ...prev, [id]: v }));
  }, []);

  const commitFloorDraft = useCallback(
    (id: string) => {
      const draft = floorDrafts[id]?.trim();
      if (!draft) {
        setEditingFloorId(null);
        return;
      }
      setFloorRows((rows) => rows.map((r) => (r.id === id ? { ...r, floor: draft } : r)));
      setEditingFloorId(null);
    },
    [floorDrafts],
  );

  const cycleBuyerStatus = useCallback((id: string) => {
    const order: BuyerAllowStatus[] = ["allowed", "preferred", "blocked"];
    setBuyers((rows) =>
      rows.map((r) => {
        if (r.id !== id) {
          return r;
        }
        const i = Math.max(0, order.indexOf(r.status));
        const next: BuyerAllowStatus = order[(i + 1) % order.length] ?? "allowed";
        return { ...r, status: next };
      }),
    );
  }, []);

  return {
    activeMode,
    setActiveMode,
    panelEntering,
    revenuePeriod,
    setRevenuePeriod,
    applyFlight,
    setApplyFlight,
    expandedDealIds,
    toggleDealExpanded,
    floorRows,
    floorDrafts,
    setFloorDraft,
    commitFloorDraft,
    editingFloorId,
    setEditingFloorId,
    buyers,
    cycleBuyerStatus,
    deals,
  };
}
