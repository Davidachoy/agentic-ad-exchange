# Agentic Ad Exchange

Autonomous ad auctions with sub-cent USDC settlement on Arc. A hackathon
submission for Circle's *Nanopayments on Arc* hackathon — buyer agents bid
on ad impressions, seller agents serve inventory, and every auction settles
as a Circle Nanopayment on Arc (≤ $0.01 / impression, $0.00 gas).

See `PLANNING.md` for architecture, `CLAUDE.md` for AI-behavior rules, and
`architecture-diagram.md` for the Mermaid system + sequence + data diagrams.

## Status

`feature/scaffolding` — this branch lands the monorepo, strict-TypeScript
plumbing, shared zod schemas, second-price auction engine, EIP-3009 builder
stub, LangGraph-based buyer/seller skeletons, a React + Vite + Tailwind
demo dashboard, and all setup scripts. **No real Circle / x402 / Gemini
calls land in this branch** — every external SDK sits behind a typed
adapter with a `// TODO(post-scaffold):` marker.

## Quick start

```bash
nvm use                                  # Node 20 LTS (.nvmrc)
pnpm install                             # installs all workspace packages
cp .env.example .env.local               # fill in Circle / Gemini keys

# --- Circle wallets (testnet) ---
pnpm --filter @ade/scripts generate:entity-secret
pnpm --filter @ade/scripts register:entity-secret
pnpm --filter @ade/scripts create:wallet-set
pnpm --filter @ade/scripts create:wallets <wallet-set-id>
pnpm --filter @ade/scripts fund:wallets          # Circle Faucet
pnpm --filter @ade/scripts deposit:gateway       # one-time Gateway deposit

# --- run the demo ---
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
wallets/          # Circle Developer-Controlled Wallets wrapper (typed stub)
agents/buyer/     # LangGraph buyer skeleton (Gemini adapter TODO)
agents/seller/    # LangGraph seller skeleton (Gemini adapter TODO)
ui/               # React + Vite + Tailwind demo dashboard
scripts/          # Wallet setup + demo-load scripts
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
| ≥ 50 on-chain transactions in demo | `server/src/routes/stream.ts` SSE + `ui/src/components/TransactionCounter.tsx` + `scripts/src/demoLoad.ts` (stub; implements in a follow-up PRP). |
| Margin explainer | `ui/src/components/MarginExplainer.tsx` — Stripe $0.30 fee vs. Nanopayment $0.00 gas comparison, copy final. |

## References

- `PLANNING.md` — authoritative architecture, data model, project structure
- `CLAUDE.md` — AI-behavior and security rules
- `hackathon-context.md` — submission brief + judging criteria
- `architecture-diagram.md` — Mermaid diagrams
- `tutorials/` — local reference for Circle / x402 / LangChain SDK patterns

## License

MIT — see `LICENSE`.
