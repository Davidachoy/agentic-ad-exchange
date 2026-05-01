# CLAUDE.md — Agentic Ad Exchange Stack

> AI behavior guide for this repository.
> This is a **hackathon project** for Circle's *Nanopayments on Arc* hackathon. Calibrate strictness accordingly: payment, auction, and wallet code needs rigor; demo UI does not.

---

## Project Awareness & Context

Read these in this order:
1. `README.md` — runnable commands and Quick Start. Note: its "Still TODO" paragraph is stale; trust the code and `REPO_SUMMARY.md` instead.
2. **Optional local context** — these are untracked working notes that may or may not exist on a given checkout. Read them if present; do not block on them if missing:
   - `PLANNING.md` — architecture, data model.
   - `hackathon-context.md` — submission brief, tracks, judging criteria.
   - `agentic-ad-exchange-stack.md` — short product spec.
   - `architecture-diagram.md` — Mermaid system / payment / data diagrams.
   - `ai-agent-micropayments-validation.md` — strategy / framing.
   - `tutorials/` — known-good Circle SDK / x402 / LangChain patterns. **If present, consult before writing novel SDK code** (these SDKs change fast). If absent, mirror existing usage in `wallets/src/circleAdapter.ts` and `server/src/middleware/nanopayments.ts`.

Before starting a new task: check the task list (via the Task tool). If the task isn't tracked, add it.

### Non-negotiable hackathon constraints

Every code path that contributes to the demo must be compatible with:

- **Per-action pricing ≤ $0.01** (USDC on Arc)
- **≥ 50 on-chain transactions** visible in the submission demo
- **Margin explainer** — the model must be demonstrably uneconomic on traditional rails

If a design choice breaks any of the above, flag it before building.

---

## Project Structure

pnpm-workspaces monorepo. Do not reshape it without flagging the change.

```
agentic-ad-exchange/
├── server/         # @ade/server         — Express API (matching, auction, SSE, x402 middleware)
├── shared/         # @ade/shared         — zod schemas, constants, env loader (zero runtime deps)
├── wallets/        # @ade/wallets        — Circle DCW SDK wrapper (server-side only)
├── agents/
│   ├── buyer/      # @ade/agents-buyer   — Buyer agent (Gemini + LangGraph) + tools
│   └── seller/     # @ade/agents-seller  — Seller agent (Gemini + LangGraph) + tools
├── ui/             # @ade/ui             — React + Vite + Tailwind dashboard
├── scripts/        # @ade/scripts        — Wallet provisioning, Gateway deposit, demo:load (≥50 cycles)
└── .env.example
```

- **Barrel exports (`index.ts`)** at each package boundary. No deep imports across packages.
- **Secrets never leave the server side.** `ui/` must never import from `@ade/wallets`, `server/src/middleware/nanopayments.ts`, or anything that touches the Circle entity secret or agent private keys. An ESLint rule enforces this — don't suppress it.

---

## Code Structure & Modularity

- **No file longer than 300 lines.** If it approaches the limit, extract. Exception: generated types, ABI/bytecode artifacts.
- **One primary export per file** (one component, one class, one agent definition). Name the file after the export.
- **Environment variables** accessed only through a typed config module (e.g. `server/src/config.ts`, `wallets/src/config.ts`). Never inline `process.env.FOO`.
- **Colocate tests** with source as `*.test.ts` / `*.test.tsx`.

---

## TypeScript

- **`strict` mode everywhere.** No `any` without a `// Reason:` comment.
- `interface` for object shapes; `type` for unions/intersections.
- **Named exports** only.
- **`zod` for all runtime validation at boundaries:** inbound HTTP requests, Circle API responses, agent tool inputs and outputs, and anything parsed from env/config.
- **USDC amounts are decimal strings with 6 decimals** end-to-end. Never serialize as floats; never do float arithmetic on prices. Use the BigInt helpers in `server/src/auction/money.ts` (`toAtomic`, `fromAtomic`, `addUsdc`, `gtUsdc`).
- No `.js` in any package's `src/`.

---

## React (applies to `ui/` only)

- Functional components only.
- Local state first; lift state up before reaching for global state. Use Zustand or context sparingly.
- Only memoize (`useMemo`/`useCallback`/`React.memo`) with a measured reason.
- Prop drilling limited to 2 levels — use composition or context beyond that.
- **CSS:** Tailwind. Don't mix with CSS-in-JS or plain CSS modules.

---

## Agent Framework Rules (`agents/buyer`, `agents/seller`)

- **Stack:** Google Gemini (via Function Calling) + LangChain / LangGraph.
- **Tool descriptions must be precise.** The LLM selects tools from their descriptions alone — vague descriptions cause wrong-tool-selection bugs that look like LLM failures.
- **Cap agent iterations at 5** per task (matches the tutorials' precedent). Prevents tool-use infinite loops.
- **Validate every tool output with `zod`** before returning it to the agent loop.
- **Never** pass wallet private keys, Circle entity secret, or raw EIP-3009 signatures into the LLM prompt or tool response surface. The agent should hold *wallet addresses and balances*, not secrets.
- Agent tools are thin wrappers over `server/` or `wallets/` functions — keep business logic out of the tool layer.

---

## Blockchain & Payment Safety (`server/`, `wallets/`, `scripts/`)

- **Development on Arc testnet only.** Mainnet reserved for final submission/judging.
- **Circle Developer-Controlled Wallets** for every agent; the entity secret lives in a server-side secrets store and is **never logged, printed, or echoed**.
- **EIP-3009 authorizations:** verify `nonce` uniqueness (persist nonces), `validAfter`/`validBefore`, and `chainId` before forwarding to Circle. Reject duplicates.
- **Auction clearing price is computed server-side only.** Never trust a price from the client, from an agent tool response, or from a seller agent.
- **Floor price enforcement** and **bid-range validation** happen in the auction engine, not in the agent layer.
- **Faucet top-ups and Gateway deposits** go through `scripts/`, never from an HTTP handler.
- **Initial Gateway deposit takes 13–19 minutes to credit on testnet** (per the nanopayments tutorial). Design flows, loading states, and demo scripts to tolerate this.
- **Trust model** framing: *"trust-minimized, with Circle as the settlement facilitator."* Don't rewrite this framing casually — if `PLANNING.md` is present locally it has the long-form version; otherwise treat this line as the canonical statement.

---

## Security

- **No secrets in `ui/`** — and no `VITE_*`/`NEXT_PUBLIC_*` env var may hold a secret.
- **Circle API key, entity secret, and wallet private keys** are loaded from env via the typed config module, server-side only.
- **Validate and sanitize all inputs** with `zod` at every boundary. Reject on first failure.
- **CORS on the Exchange API:** explicit allow-list. Never `*` in anything that will be demoed to judges.
- **httpOnly, secure, sameSite** cookies if/when any session auth is added. No JWTs in `localStorage`.
- **Rate-limit the bid endpoint** — a misbehaving buying agent can flood the matcher otherwise.
- **Run `pnpm audit`** (or `npm audit`) before the submission build.

---

## Testing

- **Vitest** for all packages. **React Testing Library** for `ui/`.
- **Auction engine:** exhaustive unit tests — second-price math, tie-breaking, floor enforcement, single-bidder degenerate case.
- **EIP-3009 builders:** test against known-good signature vectors.
- **Circle SDK calls:** mock at the SDK boundary (not deep inside handlers).
- **At least one integration test** covers the full happy path: seller register → buyer bid → match → auction → authorization signed → payment confirmed (Circle mocked) → settlement receipt stored.
- Each new feature ships with: 1 happy path, 1 edge case, 1 failure case.
- Query by role/label/text in RTL — never by className or test ID unless unavoidable.

---

## Style & Naming

- **Naming conventions:**
  - Components: `PascalCase` (`AuctionFeed.tsx`)
  - Hooks: `camelCase` with `use` prefix (`useAuctionStream.ts`)
  - Utils / functions: `camelCase` (`computeClearingPrice.ts`)
  - Types / interfaces: `PascalCase` (`BidRequest`, `SettlementReceipt`)
  - Constants: `UPPER_SNAKE_CASE` (`MAX_AGENT_ITERATIONS`)
  - Event handlers: `handle` prefix (`handleBidSubmit`)
- **JSDoc** on exports that cross package boundaries. Internal helpers don't need it.
- **`// Reason:` comments** for any non-obvious choice, any `any`, or any constraint workaround.
- Follow repo ESLint/Prettier. No inline rule overrides without a `// Reason:` comment.

---

## Performance

- Demo must sustain a **1–5 Hz auction cadence**. Avoid per-auction synchronous DB writes in the hot path — batch, stream, or write async.
- Lazy-load heavy demo routes with `React.lazy` + `Suspense`.
- Keep `ui/` bundle lean; this is a demo dashboard, not a product.

---

## Task Completion

- Use the Task tool (`TaskCreate` / `TaskUpdate`) for in-session tracking.
- If a `TASK.md` is added to the repo root, mirror completed tasks there for cross-session persistence.
- Newly discovered follow-ups go under a **Discovered During Work** section (in `TASK.md` if present, else in the Task tool).

---

## AI Behavior Rules

- **Never assume missing context. Ask questions if uncertain** — especially about Circle SDK method signatures and x402 SDK exports, which change between tutorial versions.
- **Never hallucinate libraries, functions, or Circle/x402 SDK methods.** Verify against the in-repo callers (`wallets/src/circleAdapter.ts`, `server/src/middleware/nanopayments.ts`), the local `tutorials/` directory if present, Circle's GitHub (`github.com/circlefin`), or the Arc docs before writing code that calls them.
- **Always confirm file paths and module names exist** before referencing them.
- **Never delete or overwrite existing code** unless a task explicitly instructs you to.
- For payment-, auction-, or wallet-touching code, **state your assumptions explicitly and ask before shipping**. The cost of a wrong settlement path (lost USDC, stuck nonces, demo blowup) is much higher than the cost of a clarifying question.
