import type { AdInventoryListing, AuctionResult, BidRequest, SettlementReceipt } from "@ade/shared";

import { AdSlotPreview } from "./AdSlotPreview.js";

interface PersonaCard {
  agentId: string;
  brand: string;
  vertical: string;
  bidRange: string;
  preferredTags: string[];
  accent: string;
}

const PERSONA_CARDS: ReadonlyArray<PersonaCard> = [
  {
    agentId: "buyer-luxuryco",
    brand: "LuxuryCo",
    vertical: "Premium fashion · brand awareness",
    bidRange: "$0.003 – $0.009",
    preferredTags: ["luxury", "fashion", "premium"],
    accent: "border-rose-700/50 bg-rose-900/20 text-rose-200",
  },
  {
    agentId: "buyer-growthco",
    brand: "GrowthCo",
    vertical: "B2B SaaS · performance marketing",
    bidRange: "$0.002 – $0.005",
    preferredTags: ["tech", "saas", "developer"],
    accent: "border-emerald-700/50 bg-emerald-900/20 text-emerald-200",
  },
  {
    agentId: "buyer-retailco",
    brand: "RetailCo",
    vertical: "E-commerce · retargeting",
    bidRange: "$0.002 – $0.008",
    preferredTags: ["retail", "ecommerce", "checkout-intent"],
    accent: "border-amber-700/50 bg-amber-900/20 text-amber-200",
  },
];

function bidAccent(buyerAgentId: string): string {
  if (buyerAgentId === "buyer-luxuryco") return "text-rose-300";
  if (buyerAgentId === "buyer-growthco") return "text-emerald-300";
  if (buyerAgentId === "buyer-retailco") return "text-amber-300";
  return "text-slate-300";
}

export interface BuyerPanelProps {
  bids: BidRequest[];
  lastAuction: AuctionResult | null;
  lastReceipt: SettlementReceipt | null;
  activeListing: AdInventoryListing | null;
}

export function BuyerPanel({
  bids,
  lastAuction,
  lastReceipt,
  activeListing,
}: BuyerPanelProps): JSX.Element {
  return (
    <section
      role="region"
      aria-label="Buyer agents panel"
      className="flex flex-col rounded-xl border border-slate-800 bg-exchange-card p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Buyer Agents</h2>
          <p className="text-xs text-slate-400">3 personas · own Circle DCW each</p>
        </div>
        <span className="rounded-full bg-blue-900/40 px-2 py-0.5 text-xs text-blue-300">
          Step 2
        </span>
      </div>

      {/* Persona roster — informational reference for the demo */}
      <div className="mt-4 space-y-1.5">
        {PERSONA_CARDS.map((p) => (
          <div
            key={p.agentId}
            className={`rounded-lg border ${p.accent} p-2.5 text-xs`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{p.brand}</span>
              <span className="font-mono opacity-70">{p.bidRange}</span>
            </div>
            <p className="mt-0.5 opacity-80">{p.vertical}</p>
            <p className="mt-0.5 font-mono text-[10px] opacity-60">
              tags: {p.preferredTags.join(", ")}
            </p>
          </div>
        ))}
      </div>

      {/* Bid queue */}
      <div className="mt-4">
        <p className="text-xs text-slate-400">Live bid queue ({bids.length})</p>
        {bids.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">
            No active bids — trigger Multi-Agent Auction.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {bids.map((b) => (
              <li
                key={b.bidId}
                className="rounded-lg border border-slate-700 bg-slate-800/40 p-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${bidAccent(b.buyerAgentId)}`}>
                    {b.buyerAgentId}
                  </span>
                  <span className="font-semibold text-exchange-accent">${b.bidAmountUsdc}</span>
                </div>
                <div className="mt-0.5 text-slate-500">
                  tags: {b.targeting.contextTags.join(", ") || "none"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ad slot preview — appears after auction */}
      {lastAuction != null && (
        <AdSlotPreview
          auction={lastAuction}
          receipt={lastReceipt}
          listing={activeListing}
        />
      )}
    </section>
  );
}
