import { Router } from "express";

import { runAgentAuction, type ResolvedPersona } from "../demo/runAgentAuction.js";

export interface DemoDeps {
  exchangeUrl: string;
  sellerWallet?: string;
  personas: ResolvedPersona[];
  gemini?: { apiKey: string; model: string };
}

export function createDemoRouter(deps: DemoDeps): Router {
  const router = Router();

  router.post("/demo/agent-run", async (_req, res, next) => {
    try {
      const missing: string[] = [];
      if (!deps.sellerWallet) missing.push("SELLER_WALLET_ADDRESS");
      if (!deps.gemini) missing.push("GEMINI_API_KEY");
      if (deps.personas.length === 0) missing.push("BUYER_<persona>_WALLET_ID/_ADDRESS");
      if (missing.length > 0 || !deps.sellerWallet || !deps.gemini) {
        res.status(503).json({ error: "demo_not_configured", missing });
        return;
      }
      const result = await runAgentAuction({
        exchangeUrl: deps.exchangeUrl,
        sellerWallet: deps.sellerWallet,
        personas: deps.personas,
        gemini: deps.gemini,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
