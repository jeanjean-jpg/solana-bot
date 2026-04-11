# Solana Trading Bot — Design Spec
**Date:** 2026-04-12
**Status:** Approved
**Type:** Personal trading bot with web dashboard

---

## 1. Overview

A personal Solana trading bot with a Next.js dashboard deployed on Vercel, backed by a Node.js/TypeScript bot engine running 24/7 on Railway. Supabase acts as shared state between the dashboard and the bot engine. Designed for PC/Windows use first; mobile support added in a later phase.

### Monorepo Structure
```
solana-bot/ (GitHub)
├── /dashboard   → Vercel  (Next.js 15 dark UI)
└── /bot         → Railway (Node.js/TypeScript engine)
         ↕ shared state
      Supabase (positions, trades, settings, wallets)
```

---

## 2. Dashboard — Pages & UI

**Theme:** Dark mode throughout, shadcn/ui components, clean trading terminal aesthetic.

### Pages

| Page | Description |
|---|---|
| **Overview** | Live PnL, active positions, bot status (ON/OFF), daily stats, trade feed |
| **Spot Trading** | Jupiter swaps, DCA Accumulator controls, open spot positions |
| **Perps Trading** | Drift Protocol longs/shorts, leverage slider, open perp positions, liquidation price |
| **Strategies** | Toggle each strategy ON/OFF, configure all parameters per strategy |
| **Wallets** | Add/manage encrypted trading wallets, view balances, assign to strategies, sweep profits |

### Key UI Elements
- Large **START / STOP** bot button visible on every page
- Live position cards: entry price, current price, unrealized PnL %, strategy tag
- Per-strategy toggle switches with expandable settings panels
- Trade history table with filters (strategy, wallet, date, outcome)
- Real-time updates via Supabase subscriptions (no page refresh needed)
- PIN lock on first launch (simple personal security, no full auth system)
- Telegram alert toggle in global settings

---

## 3. Strategies & Trading Modules

All strategies share a global Risk Manager. Each has its own ON/OFF toggle and dedicated settings panel.

### Strategy 1 — DCA Accumulator *(primary strategy)*
- **Logic:** Buy fixed size on entry, buy again on each configured dip %, sell full position at take-profit %
- **Settings:** Token/pair, total budget, buy size per entry, dip trigger % (e.g. -5%), take-profit %
- **Dashboard:** Shows average entry price, total invested, current value, unrealized PnL
- **Controls:** Manual "Sell All" button always visible; pause accumulation without closing position

### Strategy 2 — Swing Trading
- **Logic:** EMA crossover + RSI confirmation for entries and exits
- **Settings:** Pair, timeframe, fast/slow EMA periods, RSI overbought/oversold levels, SL/TP %
- **Execution:** Jupiter spot swap on confirmed signal

### Strategy 3 — Scalping / Momentum
- **Logic:** Short-term price spikes detected via volume surge + price action
- **Settings:** Pair, min volume threshold, max hold time, profit target %, SL %
- **Execution:** Fast Jupiter swap, position auto-closed at target or time limit

### Strategy 4 — Sniping
- **Logic:** Detects new Raydium pool creations via Helius websocket, buys within seconds
- **Filters:** Min initial liquidity, RugCheck score threshold, mint authority must be renounced
- **Settings:** Max buy size per snipe, take-profit %, auto-sell timer (failsafe)
- **Execution:** Raydium SDK v2 direct (bypasses Jupiter for speed), Jito bundle for landing

### Strategy 5 — Copy Trading
- **Logic:** Mirrors swaps of a target wallet address in real time
- **Settings:** Target wallet address, max copy size per trade, token blacklist, enabled pairs
- **Execution:** Helius websocket watches target wallet, bot replicates via Jupiter

### Strategy 6 — Perps (Drift Protocol)
- **Logic:** Long/Short perpetual positions on SOL, BTC, ETH and other Drift markets
- **Settings:** Market, direction (long/short), leverage (1x–20x), entry trigger (manual or signal), SL/TP
- **Dashboard:** Live liquidation price, margin ratio, funding rate, unrealized PnL

### Shared Risk Manager
- Max % of wallet per single trade (e.g. 10%)
- Max daily loss limit in USD (bot pauses if hit)
- Max open positions simultaneously
- Circuit breaker: stops all trading after N consecutive losses
- Per-wallet assignment: each strategy can be assigned to a specific wallet

---

## 4. Wallet Management

- Add multiple wallets by pasting private key (one-time setup per wallet)
- Keys stored **AES-256 encrypted** in Supabase — never plain text, never logged
- Each wallet card shows: label, SOL balance, token balances, total trades, PnL, status
- Assign wallets to strategies (e.g. Wallet 1 → DCA, Wallet 2 → Sniping)
- **Sweep profits** button: sends gains above a threshold to a configured cold wallet address
- Dedicated trading wallets only — main wallet never used

---

## 5. Data Model (Supabase)

| Table | Purpose |
|---|---|
| `wallets` | Encrypted keypairs, labels, cold wallet address |
| `positions` | Open trades: entry price, size, strategy, wallet, timestamp |
| `trades` | Completed trade history: PnL, fees, tx signature, duration |
| `strategies` | Per-strategy config JSON + enabled/disabled flag |
| `bot_state` | Global ON/OFF switch, last heartbeat, active strategy count |
| `alerts` | Trade events for Telegram notifications |

Real-time subscriptions on `positions` and `bot_state` for live dashboard updates.

---

## 6. Security

- Dashboard protected by PIN lock (set on first launch, stored hashed in localStorage)
- Private keys AES-256 encrypted before writing to Supabase, decrypted only in bot engine memory
- Bot engine on Railway only communicates with its own Supabase instance via service role key
- All secrets in `.env` files, gitignored from day one
- Private keys never logged, never transmitted over network unencrypted
- Dedicated trading wallets funded only with operating capital; profits swept to cold storage regularly

---

## 7. Tech Stack

### Dashboard (Vercel)
| Tool | Purpose |
|---|---|
| Next.js 15 (App Router) | Framework |
| Tailwind CSS | Styling |
| shadcn/ui | Dark mode component library |
| Recharts | PnL charts, price graphs |
| Supabase JS client | Real-time data + DB access |

### Bot Engine (Railway)
| Tool | Purpose |
|---|---|
| Node.js + TypeScript | Runtime |
| `@jup-ag/api` | Spot swaps via Jupiter v6 |
| `@drift-labs/sdk` | Perpetuals trading |
| `@raydium-io/raydium-sdk-v2` | New pool sniping |
| `helius-sdk` | Premium RPC + websockets |
| `jito-ts` | MEV-protected TX bundles |
| `better-sqlite3` | Local trade cache (failsafe if Supabase unreachable) |
| `node-telegram-bot-api` | Trade alerts |
| `pino` | Structured logging |

### External Services
| Service | Purpose | Cost |
|---|---|---|
| Helius | Premium Solana RPC | ~$49/mo |
| Jito | MEV protection on large trades | Per bundle tip |
| Railway | Bot engine hosting | Free / ~$5/mo |
| Vercel | Dashboard hosting | Free |
| Supabase | Database + real-time | Free tier |
| Birdeye API | Token data, OHLCV, rug checks | Free tier |
| Telegram Bot | Trade alerts | Free |

**Estimated monthly cost: ~$54/mo**

---

## 8. Bot Engine — Internal Architecture

```
src/
├── index.ts                   # Entry point, boots strategy runner
├── config/
│   ├── env.ts                 # Zod-validated env vars
│   └── constants.ts           # Token mints, program IDs, thresholds
├── core/
│   ├── connection.ts          # Helius RPC wrapper w/ retry
│   ├── wallet.ts              # Keypair loader (AES decrypt)
│   └── logger.ts              # Pino instance
├── execution/
│   ├── jupiter.ts             # Quote + swap via Jupiter v6
│   ├── drift.ts               # Perps via Drift SDK
│   ├── raydium.ts             # Direct Raydium SDK (sniping)
│   ├── priorityFee.ts         # Dynamic fee calculation
│   ├── jito.ts                # Bundle submission
│   └── txSender.ts            # Unified send + confirm + retry
├── market/
│   ├── priceFeed.ts           # Jupiter price + Pyth oracle
│   ├── birdeye.ts             # OHLCV, token metadata, rug check
│   └── poolWatcher.ts         # New Raydium pool detection
├── strategies/
│   ├── base.ts                # Strategy interface
│   ├── dca.ts                 # DCA Accumulator
│   ├── swing.ts               # EMA + RSI swing trading
│   ├── scalping.ts            # Momentum scalping
│   ├── sniper.ts              # New pool sniper
│   ├── copyTrade.ts           # Wallet copy trading
│   └── perps.ts               # Drift perps strategy
├── risk/
│   ├── riskManager.ts         # Position sizing, limits
│   ├── stopLoss.ts            # SL/TP monitor loop
│   └── circuitBreaker.ts      # Kill-switch logic
├── state/
│   ├── supabase.ts            # Supabase client + helpers
│   ├── positions.ts           # Position CRUD
│   └── trades.ts              # Trade history
└── notify/
    └── telegram.ts            # Alert dispatcher
```

---

## 9. Deployment Flow

1. Push to GitHub `main` branch
2. Vercel auto-deploys dashboard
3. Railway auto-deploys bot engine
4. Both connect to same Supabase project via env vars
5. Dashboard reads/writes strategy config; bot engine polls config and executes

---

## 10. Out of Scope (v1)

- Mobile / iPhone access (Phase 2)
- WalletConnect / Phantom browser extension connect
- Backtesting engine (future)
- Multi-user support (personal use forever)
- Raydium Perps direct integration (waiting for SDK)
