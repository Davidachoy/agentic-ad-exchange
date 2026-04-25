import { useEffect, useState } from "react";

import type { AdInventoryListing, BidRequest } from "@ade/shared";

import { postBid, postInventory, runAuction } from "./api/client.js";
import { AuctionFeed } from "./components/AuctionFeed.js";
import { AuctionPanel } from "./components/AuctionPanel.js";
import { BuyerPanel } from "./components/BuyerPanel.js";
import { MarginExplainer } from "./components/MarginExplainer.js";
import { SellerPanel } from "./components/SellerPanel.js";
import { TransactionCounter } from "./components/TransactionCounter.js";
import { useAuctionStream } from "./hooks/useAuctionStream.js";
import { useBids } from "./hooks/useBids.js";
import { useInventory } from "./hooks/useInventory.js";

function randomNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const SELLER_WALLET = "0xcc00000000000000000000000000000000000003";
const BUYER_A_WALLET = "0xaa00000000000000000000000000000000000001";
const BUYER_B_WALLET = "0xbb00000000000000000000000000000000000002";

export function App(): JSX.Element {
  const { connected, settlementCount, auctions, lastAuction, lastReceipt } = useAuctionStream();
  const { listings, refresh: refreshInventory } = useInventory();
  const { bids, refresh: refreshBids } = useBids();

  const [registering, setRegistering] = useState(false);
  const [biddingA, setBiddingA] = useState(false);
  const [biddingB, setBiddingB] = useState(false);
  const [running, setRunning] = useState(false);
  const [activeListingId, setActiveListingId] = useState<string | null>(null);
  const [anyBidPlaced, setAnyBidPlaced] = useState(false);

  useEffect(() => {
    if (!activeListingId && listings.length > 0) {
      setActiveListingId(listings[0]?.listingId ?? null);
    }
  }, [listings, activeListingId]);

  const activeListing = listings.find((l) => l.listingId === activeListingId) ?? null;

  async function handleRegisterListing(): Promise<void> {
    setRegistering(true);
    try {
      const listing: AdInventoryListing = {
        listingId: crypto.randomUUID(),
        sellerAgentId: "seller-agent-sigma",
        sellerWallet: SELLER_WALLET,
        adType: "display",
        format: "banner",
        size: "300x250",
        contextualExclusions: [],
        floorPriceUsdc: "0.002",
        createdAt: new Date().toISOString(),
      };
      await postInventory(listing);
      await refreshInventory();
    } catch (err) {
      console.error("Register listing failed:", err);
    } finally {
      setRegistering(false);
    }
  }

  async function handlePlaceBid(buyer: "A" | "B"): Promise<void> {
    const isA = buyer === "A";
    const setter = isA ? setBiddingA : setBiddingB;
    setter(true);
    try {
      const bid: BidRequest = {
        bidId: crypto.randomUUID(),
        buyerAgentId: isA ? "buyer-agent-alpha" : "buyer-agent-beta",
        buyerWallet: isA ? BUYER_A_WALLET : BUYER_B_WALLET,
        targeting: {
          adType: "display",
          format: "banner",
          size: "300x250",
          contextTags: isA ? ["tech", "ai"] : ["dev", "tools"],
        },
        bidAmountUsdc: isA ? "0.008" : "0.006",
        budgetRemainingUsdc: "1.000",
        nonce: randomNonce(),
        createdAt: new Date().toISOString(),
      };
      await postBid(bid);
      setAnyBidPlaced(true);
      await refreshBids();
    } catch (err) {
      console.error("Place bid failed:", err);
    } finally {
      setter(false);
    }
  }

  async function handleRunAuction(): Promise<void> {
    if (!activeListingId) return;
    setRunning(true);
    try {
      await runAuction(activeListingId);
      await refreshBids();
    } catch (err) {
      console.error("Run auction failed:", err);
    } finally {
      setRunning(false);
    }
  }

  const step2Done = anyBidPlaced || bids.length > 0;
  const step3Done = lastAuction != null;
  const step4Done = lastReceipt?.status === "confirmed";

  return (
    <div className="min-h-screen bg-exchange-bg text-slate-100">
      <main className="mx-auto max-w-7xl p-6">
        {/* Header */}
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Agentic Ad Exchange</h1>
            <p className="mt-1 text-sm text-slate-400">
              AI agents buy &amp; sell ad impressions · settled via Circle Arc nanopayments
            </p>
          </div>
          <span
            aria-label="Exchange connection status"
            className={`mt-1 text-xs uppercase tracking-wide ${
              connected ? "text-exchange-accent" : "text-slate-500"
            }`}
          >
            {connected ? "● live" : "○ connecting…"}
          </span>
        </header>

        {/* Happy path guide */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto rounded-xl border border-slate-800 bg-exchange-card px-5 py-3.5">
          <FlowStep n={1} label="Register ad slot" done={listings.length > 0} />
          <FlowArrow />
          <FlowStep n={2} label="Place bids" done={step2Done} />
          <FlowArrow />
          <FlowStep n={3} label="Run auction" done={step3Done} />
          <FlowArrow />
          <FlowStep n={4} label="Ad goes live" done={step4Done} />
        </div>

        {/* Main panels */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <SellerPanel
            listings={listings}
            onRegister={handleRegisterListing}
            registering={registering}
          />
          <AuctionPanel
            listings={listings}
            activeListingId={activeListingId}
            onSelectListing={setActiveListingId}
            onRunAuction={handleRunAuction}
            running={running}
            lastAuction={lastAuction}
            lastReceipt={lastReceipt}
          />
          <BuyerPanel
            bids={bids}
            onPlaceBid={handlePlaceBid}
            biddingA={biddingA}
            biddingB={biddingB}
            lastAuction={lastAuction}
            lastReceipt={lastReceipt}
            activeListing={activeListing}
          />
        </div>

        {/* Bottom row */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <AuctionFeed auctions={auctions} />
          <TransactionCounter count={settlementCount} />
          <MarginExplainer />
        </div>
      </main>
    </div>
  );
}

function FlowStep({ n, label, done }: { n: number; label: string; done: boolean }): JSX.Element {
  return (
    <div
      className={`flex shrink-0 items-center gap-2 ${done ? "text-exchange-accent" : "text-slate-500"}`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          done ? "bg-exchange-accent text-exchange-bg" : "bg-slate-700 text-slate-400"
        }`}
      >
        {done ? "✓" : n}
      </span>
      <span className="whitespace-nowrap text-xs">{label}</span>
    </div>
  );
}

function FlowArrow(): JSX.Element {
  return <span className="shrink-0 text-xs text-slate-600">→</span>;
}
