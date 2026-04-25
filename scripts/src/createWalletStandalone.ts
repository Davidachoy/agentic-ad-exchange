import { loadRootEnv } from "@ade/shared/env";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

interface CliArgs {
  walletSetId?: string;
  walletSetName?: string;
  blockchain: string;
  count: number;
}

function parseArgs(argv: ReadonlyArray<string>): CliArgs {
  const args: CliArgs = { blockchain: "ARC-TESTNET", count: 1 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    switch (a) {
      case "--wallet-set-id":
        if (!next) throw new Error("--wallet-set-id requires a value");
        args.walletSetId = next;
        i++;
        break;
      case "--name":
        if (!next) throw new Error("--name requires a value");
        args.walletSetName = next;
        i++;
        break;
      case "--blockchain":
        if (!next) throw new Error("--blockchain requires a value");
        args.blockchain = next;
        i++;
        break;
      case "--count":
        if (!next) throw new Error("--count requires a value");
        args.count = Number(next);
        if (!Number.isInteger(args.count) || args.count < 1 || args.count > 10) {
          throw new Error("--count must be an integer between 1 and 10");
        }
        i++;
        break;
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${a}`);
    }
  }
  return args;
}

function printUsage(): void {
  console.log(
    [
      "Usage: pnpm --filter @ade/scripts create:wallet [options]",
      "",
      "Creates a fresh Circle DCW wallet without consulting any project env",
      "vars beyond CIRCLE_API_KEY + CIRCLE_ENTITY_SECRET. Useful when stale",
      "BUYER_*_WALLET_ID values would otherwise fail the strict zod config.",
      "",
      "Options:",
      "  --wallet-set-id <id>   Reuse an existing wallet set (else a new one is created).",
      "  --name <string>        Name for a freshly created wallet set (default: ade-standalone-<ts>).",
      "  --blockchain <id>      DCW blockchain id (default: ARC-TESTNET).",
      "  --count <n>            Wallets to create in this run (1–10, default 1).",
      "  -h, --help             Show this message.",
      "",
      "Required env (loaded from monorepo .env.local / .env):",
      "  CIRCLE_API_KEY",
      "  CIRCLE_ENTITY_SECRET   (64-char hex)",
    ].join("\n"),
  );
}

function loadCircleEnv(): { apiKey: string; entitySecret: string } {
  loadRootEnv();
  const apiKey = process.env.CIRCLE_API_KEY?.trim();
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET?.trim();
  if (!apiKey) {
    throw new Error("CIRCLE_API_KEY is missing — set it in .env.local or export it inline.");
  }
  if (!entitySecret || !/^[a-fA-F0-9]{64}$/.test(entitySecret)) {
    throw new Error(
      "CIRCLE_ENTITY_SECRET is missing or not 64-char hex — generate one with `pnpm --filter @ade/scripts generate:entity-secret`.",
    );
  }
  return { apiKey, entitySecret };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { apiKey, entitySecret } = loadCircleEnv();

  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

  let walletSetId = args.walletSetId;
  let createdWalletSet = false;
  if (!walletSetId) {
    const name = args.walletSetName ?? `ade-standalone-${Date.now()}`;
    const setResp = await client.createWalletSet({ name });
    walletSetId = setResp.data?.walletSet?.id;
    if (!walletSetId) {
      throw new Error("Circle createWalletSet returned no walletSet.id");
    }
    createdWalletSet = true;
    console.log(`✓ Created wallet set "${name}" → ${walletSetId}`);
  } else {
    console.log(`→ Reusing wallet set ${walletSetId}`);
  }

  const walletResp = await client.createWallets({
    walletSetId,
    blockchains: [args.blockchain as unknown as never],
    count: args.count,
    accountType: "EOA",
  });
  const wallets = walletResp.data?.wallets ?? [];
  if (wallets.length === 0) {
    throw new Error("Circle createWallets returned no wallets");
  }

  console.log("");
  console.log("================ Wallets Created ================");
  if (createdWalletSet) console.log(`WALLET_SET_ID=${walletSetId}`);
  for (const [i, w] of wallets.entries()) {
    if (!w.id || !w.address) {
      throw new Error(`Wallet at index ${i} missing id or address`);
    }
    console.log(`# wallet[${i}]`);
    console.log(`WALLET_ID=${w.id}`);
    console.log(`WALLET_ADDRESS=${w.address}`);
  }
  console.log("=================================================");
  console.log("");
  console.log("Next steps:");
  console.log(" 1. Paste the lines above into .env.local under the persona slot you need");
  console.log("    (BUYER_LUXURYCO_*, BUYER_GROWTHCO_*, BUYER_RETAILCO_*, or BUYER_WALLET_*).");
  console.log(" 2. Fund the address(es) via https://faucet.circle.com (Arc Testnet, USDC).");
  console.log(" 3. Restart the server.");
}

const isEntry =
  typeof process !== "undefined" &&
  typeof process.argv[1] === "string" &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isEntry) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
