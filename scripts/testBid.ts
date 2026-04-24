import { placeBid } from "../src/agents/buyer/index.js";

console.log("🚀 Starting test bid...");

const result = await placeBid({
  listingId: "c7ae387a-c273-41e5-8e99-b5aec270b4b1",
  buyerId: "buyer1",
  adType: "banner",
  adFormat: "display",
  amount: 0.007,
});

console.log("Result:", JSON.stringify(result, null, 2));
