import { placeBid } from "../src/agents/buyer/index.js";

console.log("🚀 Starting test bid...");

const result = await placeBid({
  listingId: "5111cd49-3728-4e4c-a84c-fb8c535c6e90",
  buyerId: "buyer1",
  adType: "banner",
  adFormat: "display",
  amount: 0.007,
});

console.log("Result:", JSON.stringify(result, null, 2));
