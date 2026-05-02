/** Composer-only modes for Atlas trader input (not persisted). */
export type AtlasComposerMode = "direct" | "goal" | "policy";

/** Canned assistant replies for composer sends (demo UX). */
export function getSimulatedAtlasReply(mode: AtlasComposerMode, message: string): string {
  if (mode === "goal") {
    return "Campaign objective updated. I'll optimize all decisions toward this goal from now on.";
  }
  if (mode === "policy") {
    return "Policy saved. I'll apply this rule to every decision going forward. You can review or remove it anytime in the Review tab.";
  }
  if (/\b(bid|bids|bidding|cpm)\b/i.test(message)) {
    return "Got it. Executing bid strategy on Roku CTV for Solstice 1P with $20k daily cap through Sunday.";
  }
  if (/\bpaus(e|ed|es|ing)?\b/i.test(message)) {
    return "Pausing that supply path now. Budget will be redistributed to Hulu and Meridian.";
  }
  return "Understood. Processing that instruction now.";
}
