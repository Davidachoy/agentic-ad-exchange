import type { AdInventoryListing } from "@ade/shared";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import { postInventory, runAuction } from "../api/client.js";
import { AppNav } from "../components/AppNav.js";
import { AuctionFeed } from "../components/AuctionFeed.js";
import { AuctionPanel } from "../components/AuctionPanel.js";
import { BuyerPanel } from "../components/BuyerPanel.js";
import { MarginExplainer } from "../components/MarginExplainer.js";
import { PauseButton } from "../components/PauseButton.js";
import { SellerPanel } from "../components/SellerPanel.js";
import { SettlementLedger } from "../components/SettlementLedger.js";
import { TransactionCounter } from "../components/TransactionCounter.js";
import { useDashboardData } from "../context/DashboardDataContext.js";
import { uiEnv } from "../env.js";

export function ExchangePage(): JSX.Element {
  const {
    connected,
    settlementCount,
    auctions,
    lastAuction,
    lastReceipt,
    confirmedReceipts,
    listings,
    refreshInventory,
    bids,
    refreshBids,
    control,
  } = useDashboardData();

  const [registering, setRegistering] = useState(false);
  const [running, setRunning] = useState(false);
  const [activeListingId, setActiveListingId] = useState<string | null>(null);
  const [cycleAuctionId, setCycleAuctionId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeListingId && listings.length > 0) {
      setActiveListingId(listings[0]?.listingId ?? null);
    }
  }, [listings, activeListingId]);

  useEffect(() => {
    if (lastAuction) setCycleAuctionId(lastAuction.auctionId);
  }, [lastAuction?.auctionId]);

  useEffect(() => {
    if (
      lastReceipt?.status === "confirmed" &&
      cycleAuctionId !== null &&
      lastReceipt.auctionId === cycleAuctionId
    ) {
      const t = window.setTimeout(() => setCycleAuctionId(null), 2500);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [lastReceipt?.receiptId, lastReceipt?.status, lastReceipt?.auctionId, cycleAuctionId]);

  const activeListing = listings.find((l) => l.listingId === activeListingId) ?? null;

  async function handleRegisterListing(): Promise<void> {
    const sellerWallet = uiEnv.VITE_SELLER_WALLET_ADDRESS;
    if (!sellerWallet) return;
    setRegistering(true);
    try {
      const listing: AdInventoryListing = {
        listingId: crypto.randomUUID(),
        sellerAgentId: "seller-agent-sigma",
        sellerWallet,
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

  async function handleRunAuction(): Promise<void> {
    if (!activeListingId) return;
    setRunning(true);
    setCycleAuctionId(null);
    try {
      await runAuction(activeListingId);
      await refreshBids();
    } catch (err) {
      console.error("Run auction failed:", err);
    } finally {
      setRunning(false);
    }
  }

  const cycleActive = cycleAuctionId !== null;
  const step2Done = cycleActive && (bids.length > 0 || lastAuction != null);
  const step3Done = cycleActive && lastAuction != null;
  const step4Done = cycleActive && lastReceipt?.status === "confirmed";

  return (
    <div className="min-h-screen bg-exchange-bg text-slate-100">
      <main className="mx-auto max-w-7xl p-6">
        <AppNav />
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Agentic Ad Exchange</h1>
            <p className="mt-1 text-sm text-slate-400">
              AI agents buy &amp; sell ad impressions · settled via Circle Arc nanopayments
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PauseButton
              paused={control.paused}
              pending={control.pending}
              onPause={() => void control.pause()}
              onResume={() => void control.resume()}
            />
            <span
              aria-label="Exchange connection status"
              className={`mt-1 text-xs uppercase tracking-wide ${
                connected ? "text-exchange-accent" : "text-slate-500"
              }`}
            >
              {connected ? "● live" : "○ connecting…"}
            </span>
          </div>
        </header>

        {control.paused && (
          <div
            role="status"
            className="mb-6 rounded-lg border border-amber-700/60 bg-amber-900/20 px-4 py-2.5 text-sm text-amber-200"
          >
            Demo paused — buyer agents, seller agent, and auto-clear are halted.
            Click Resume to continue.
          </div>
        )}

        <div className="mb-6 flex items-center gap-2 overflow-x-auto rounded-xl border border-slate-800 bg-exchange-card px-5 py-3.5">
          <FlowStep n={1} label="Seller lists" done={listings.length > 0} />
          <FlowArrow />
          <FlowStep n={2} label="Buyers bid" done={step2Done} />
          <FlowArrow />
          <FlowStep n={3} label="Auction clears" done={step3Done} />
          <FlowArrow />
          <FlowStep n={4} label="Ad goes live" done={step4Done} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <SellerPanel
            listings={listings}
            onRegister={handleRegisterListing}
            registering={registering}
            disabledReason={
              uiEnv.VITE_SELLER_WALLET_ADDRESS
                ? null
                : "Set VITE_SELLER_WALLET_ADDRESS to enable manual registration"
            }
          />
          <BuyerPanel
            bids={bids}
            lastAuction={lastAuction}
            lastReceipt={lastReceipt}
            activeListing={activeListing}
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
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <AuctionFeed auctions={auctions} />
          <TransactionCounter count={settlementCount} />
          <SettlementLedger
            receipts={confirmedReceipts}
            sellerAddress={uiEnv.VITE_SELLER_WALLET_ADDRESS}
          />
        </div>

        <div className="mt-6">
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
