# Agentic Ad Exchange

Autonomous real-time bidding (RTB) auctions with sub-cent USDC settlement on Arc Testnet. Publishers list inventory, buyer agents compete in a second-price auction, and the winner pays via Circle Developer-Controlled Wallets — no manual settlement required.

## Architecture

```
src/
├── config.ts                  # Centralised env vars and blockchain constants
├── types/index.ts             # Shared interfaces: Bid, InventoryListing, AuctionResult
├── exchange/
│   ├── auction.ts             # Second-price (Vickrey) auction engine
│   ├── server.ts              # Express server + x402 Gateway middleware
│   └── index.ts              # Barrel export
├── wallets/
│   ├── circleClient.ts        # Circle DCW: transferUSDC, getBalance, waitForTx
│   └── index.ts              # Barrel export
└── agents/buyer/
    ├── tools/placeBid.ts      # GatewayClient bid tool (x402 nanopayment)
    └── index.ts              # Barrel export

scripts/
├── initWallets.ts            # Create buyer + seller DCWs
├── depositGateway.ts         # Fund buyer's x402 Gateway balance
├── testAuction.ts            # Run a local auction (no network)
├── testBid.ts                # Place a live bid against the running server
└── testTransfer.ts           # Test DCW USDC transfer directly
```

## Payment rails

| Flow | Rail |
|------|------|
| Bid fee ($0.001 per bid) | Circle x402 Gateway (EIP-3009 batch settlement) |
| Clearing price (winner → seller) | Circle Developer-Controlled Wallets (DCW) |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in the values (see comments in `.env.example`).

### 3. Create wallets

```bash
npm run script:initWallets
```

Copy the printed `BUYER_WALLET_*` and `SELLER_WALLET_*` values into your `.env`.

### 4. Fund the wallets

Go to [faucet.circle.com](https://faucet.circle.com) → Arc Testnet and request test USDC for both addresses.

### 5. Fund the buyer's Gateway balance

The buyer needs USDC pre-deposited in the GatewayWallet contract for the x402 bid fee:

```bash
npm run script:depositGateway
```

## Running the exchange

```bash
# Development (live reload)
npm run dev

# Production
npm start
```

The server starts on `http://localhost:3000`.

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/inventory` | none | List an ad slot |
| `POST` | `/auction/bid` | x402 $0.001 | Place a bid |
| `POST` | `/auction/run/:listingId` | none | Run auction + settle |
| `GET` | `/stats` | none | Auction stats |
| `GET` | `/health` | none | Health check |

## Scripts

```bash
npm run script:testAuction    # Offline auction logic test
npm run script:testBid        # Live bid against running server
npm run script:testTransfer   # DCW transfer smoke test
```

## TypeScript

```bash
npm run build   # tsc --noEmit (type-check only)
```
