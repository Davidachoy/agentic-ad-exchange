# Agentic Ad Exchange

Autonomous ad auctions with sub-cent USDC settlement on Arc. A hackathon
submission for Circle's *Nanopayments on Arc* hackathon — buyer agents bid
on ad impressions, seller agents serve inventory, and every auction settles
as a Circle Nanopayment on Arc (≤ $0.01 / impression, $0.00 gas).

See `PLANNING.md` for architecture, `CLAUDE.md` for AI-behavior rules, and
`architecture-diagram.md` for the Mermaid system + sequence + data diagrams.

## Status

Scaffolding + **real Circle wiring for setup, wallets, deposit, and demo
load.** The monorepo, strict-TypeScript plumbing, shared zod schemas,
second-price auction engine, EIP-3009 builder stub, LangGraph-based
buyer/seller skeletons, and React + Vite + Tailwind dashboard are all in
place.

Wired with real SDK calls:

- `@ade/wallets::createCircleClient` — real
  `@circle-fin/developer-controlled-wallets` adapter (createWalletSet /
  createWallet / getBalance / transfer / `waitForTx`).
- `scripts/src/*.ts` — real `create:wallet-set`, `create:wallets`,
  `fund:wallets` (balance report), `deposit:gateway` (Gateway deposit +
  13–19 min testnet credit poll), `demo:load` (≥ 50 real DCW transfers +
  margin-explainer banner).

Still TODO (carry-over from the PRP backlog): Gemini in the agent loop, the
x402-batching server middleware on `POST /bid`, the `POST /auction/run/:id`
route, and resolving the `ARC_TESTNET_USDC` placeholder.

## Quick start

```bash
nvm use                                  # Node 20 LTS (.nvmrc)
pnpm install                             # installs all workspace packages
cp .env.example .env.local               # fill in Circle / Gemini keys

# --- Circle DCW setup (testnet) ---
pnpm --filter @ade/scripts generate:entity-secret      # writes CIRCLE_ENTITY_SECRET to .env.local
pnpm --filter @ade/scripts register:entity-secret      # registers with Circle; saves recovery file
pnpm --filter @ade/scripts create:wallet-set           # idempotent; prints WALLET_SET_ID to copy into .env.local
pnpm --filter @ade/scripts create:wallets              # reads WALLET_SET_ID from env; prints buyer + seller ids/addresses

# Fund both DCWs at https://faucet.circle.com (Arc Testnet), then:
pnpm --filter @ade/scripts fund:wallets                # prints current DCW balances (faucet is a manual step)

# --- Gateway deposit (one-time, 13–19 min testnet credit) ---
# BUYER_PRIVATE_KEY is a *separate* EOA that signs approve + deposit — not a DCW key.
# Generate one: node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"
# Paste into .env.local as BUYER_PRIVATE_KEY, then:
pnpm --filter @ade/scripts show:address                # prints the EOA address — fund with USDC on the Circle Faucet
pnpm --filter @ade/scripts deposit:gateway             # deposits + polls getBalances until credited

# --- Run the ≥ 50-cycle demo load ---
pnpm --filter @ade/scripts demo:load                   # buyer → seller DCW transfers @ ≤ $0.01 each, prints margin banner

# --- Run the dashboard ---
pnpm dev                                 # server :4021, UI :5173
```

Then open <http://localhost:5173>. You should see:

- an empty auction feed,
- a transaction counter at `0`,
- the margin-explainer card comparing Stripe vs. Nanopayments.

The Exchange health check: `curl http://localhost:4021/health` → `{"status":"ok"}`.

## Important warnings

- **Testnet only.** `CIRCLE_ENVIRONMENT=testnet` is required; mainnet paths
  are guarded and forbidden until the submission build.
- **Gateway deposit takes 13–19 minutes to credit on testnet** after on-chain
  confirmation. The `deposit:gateway` script polls until the balance appears;
  leave it running.
- **No secrets in `ui/`.** Only `VITE_API_BASE_URL=/api` is allowed in
  `ui/.env*`; the Circle API key, entity secret, and any private key are
  server-side only. An ESLint rule blocks `ui/**` from importing
  `@ade/wallets` or the Gateway middleware.
- **Rate limits** on `POST /bid` are keyed by buyer wallet (not IP). Demo
  agents share a loopback IP, so IP-keyed limits would starve each other.

## Packages

```
shared/           # zod schemas, constants, shared types
server/           # Express exchange (auction, routes, SSE, EIP-3009 stub)
wallets/          # Circle DCW wrapper — real SDK behind a zod-typed adapter
agents/buyer/     # LangGraph buyer skeleton (Gemini adapter TODO)
agents/seller/    # LangGraph seller skeleton (Gemini adapter TODO)
ui/               # React + Vite + Tailwind demo dashboard
scripts/          # Wallet setup + Gateway deposit + ≥ 50-cycle demo load
```

## Validation gates

```bash
pnpm typecheck     # pnpm -r exec tsc --noEmit
pnpm lint          # eslint .
pnpm test          # pnpm -r test (vitest + RTL)
pnpm build         # pnpm -r build
pnpm audit         # 0 high / 0 critical expected at scaffold time
```

## Hackathon constraints (do not regress)

| Constraint | Enforced by |
|---|---|
| Per-action pricing ≤ $0.01 | `shared/src/constants.ts` (`NANOPAYMENT_UNIT_USDC`, `MAX_CLEARING_PRICE_USDC`) + `server/src/auction/engine.ts` cap. |
| ≥ 50 on-chain transactions in demo | `scripts/src/demoLoad.ts` drives `DEMO_LOAD_CYCLES` (default 50, min-enforced at config) DCW transfers; each prints an Arc explorer URL, and the script fails loud if fewer settle. Live SSE feed via `server/src/routes/stream.ts` + `ui/src/components/TransactionCounter.tsx`. |
| Margin explainer | `scripts/src/demoLoad.margin.ts` prints the final terminal banner; `ui/src/components/MarginExplainer.tsx` shows the Stripe $0.30 fee vs. Nanopayment $0.00 gas comparison in the dashboard. |

## References

- `PLANNING.md` — authoritative architecture, data model, project structure
- `CLAUDE.md` — AI-behavior and security rules
- `hackathon-context.md` — submission brief + judging criteria
- `architecture-diagram.md` — Mermaid diagrams
- `tutorials/` — local reference for Circle / x402 / LangChain SDK patterns

## License

MIT — see `LICENSE`.
