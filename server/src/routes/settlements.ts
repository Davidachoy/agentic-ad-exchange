import { Router } from "express";

import type { SettlementStore } from "../state/stores.js";

export interface SettlementDeps {
  settlementStore: SettlementStore;
}

export function createSettlementRouter(deps: SettlementDeps): Router {
  const router = Router();
  router.get("/settlements", async (_req, res, next) => {
    try {
      const items = await deps.settlementStore.list();
      res.json({ items });
    } catch (err) {
      next(err);
    }
  });
  return router;
}
