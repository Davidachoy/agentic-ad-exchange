export const SELLER_CHIP_SUGGESTIONS = [
  "Why did my fill rate drop on CTV yesterday?",
  "Which buyer is paying the most for homepage inventory?",
  "Show me all deals expiring this month.",
  "What floor price maximizes revenue on mobile banner?",
] as const;

export type SellerChipSuggestion = (typeof SELLER_CHIP_SUGGESTIONS)[number];

export function isSellerChipSuggestion(text: string): text is SellerChipSuggestion {
  return (SELLER_CHIP_SUGGESTIONS as readonly string[]).includes(text);
}

export function getSellerChipDemoReply(text: string): string | null {
  if (!isSellerChipSuggestion(text)) {
    return null;
  }
  switch (text) {
    case SELLER_CHIP_SUGGESTIONS[0]:
      return "Fill rate on CTV fell to **34%** vs **71%** on mobile banner — the floor at **$4.20** is above where most DSPs clear. I can model a **$3.20** floor in **Set floor** mode if you want a recovery path.";
    case SELLER_CHIP_SUGGESTIONS[1]:
      return "**Northwave** is leading homepage **970×250** at **$2.14 eCPM** today (~**44%** of homepage revenue in this demo snapshot).";
    case SELLER_CHIP_SUGGESTIONS[2]:
      return "You have **2 drafts** and **1 negotiating** deal in the **Deals** tab. Nothing flagged as expiring within **30 days** in this demo dataset.";
    case SELLER_CHIP_SUGGESTIONS[3]:
      return "On **mobile banner**, observed clearing band is **$0.80–$1.10** today. A **$1.00** floor balances fill vs margin; push toward **$1.20** only if demand holds (see **Floors** tab hints).";
    default:
      return null;
  }
}
