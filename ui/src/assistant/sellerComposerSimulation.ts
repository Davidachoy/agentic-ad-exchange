/** Composer modes for seller yield assistant (demo). */
export type SellerComposerMode = "ask" | "set_floor" | "configure_deal" | "block_buyer" | "analyze";

export function getSimulatedSellerReply(mode: SellerComposerMode, message: string): string {
  const m = message.trim();

  if (mode === "ask") {
    if (m.length === 0) {
      return "Ask anything about this publisher shell—floors, deals, buyers, or what to do next. Use **Analyze** for a canned performance readout, or the other modes for structured actions.";
    }
    return "Noted. In this demo I’m answering locally—use the **Revenue** / **Floors** / **Deals** / **Buyers** panel for snapshots, or switch to **Analyze** / **Set floor** when you want a guided reply.";
  }

  if (mode === "set_floor") {
    const hasPrice = /\$\s*[0-9]+(?:[.,][0-9]{2})?/.test(m) || /[0-9]+(?:[.,][0-9]{2})\s*(?:cpm|usd)?/i.test(m);
    const hasPlacement = /ctv|pre-roll|preroll|homepage|mobile|banner|placement|970|250|30s/i.test(m);
    if (hasPrice && hasPlacement) {
      return "Got it. Dropping CTV pre-roll from $4.20 → $3.20. Projected fill rate: 68% (+34pp). Estimated revenue recovery: +$840/day. Confirm?";
    }
    return "Floor update noted. Atlas will apply this to the next auction cycle.";
  }

  if (mode === "configure_deal") {
    return "Deal structured as draft: Northwave · $4.80 CPM · 30d · 8.4M imps/mo. Review in the Deals tab before activating.";
  }

  if (mode === "block_buyer") {
    return "Blocking Trade Desk from homepage. Estimated revenue impact: -$340/day. Confirm?";
  }

  return "Revenue dropped 18% yesterday on CTV pre-roll due to floor at $4.20 cutting demand from 3 DSPs. Hulu and Meridian compensated partially. Recommend floor review.";
}
