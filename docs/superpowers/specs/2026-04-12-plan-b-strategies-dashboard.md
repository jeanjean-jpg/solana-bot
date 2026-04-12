# Solana Trading Bot — Plan B Design Spec
**Date:** 2026-04-12
**Status:** Approved
**Type:** Full strategy implementation + dashboard UI completion

---

## Overview

Plan B completes the trading bot by implementing all 6 strategy classes in the bot engine, wiring the Risk Manager, and finishing the dashboard UI (strategy config panels, Spot page, Perps page). Plan A built the foundation (auth, wallets, real-time hooks, bot heartbeat). Plan B makes it trade.

---

## 1. Bot Engine — Strategy Orchestrator

A single `StrategyRunner` class manages all 6 strategies as independent async loops.

### Architecture

- On startup, reads `strategies` table and instantiates each enabled strategy
- Each strategy implements `BaseStrategy` interface: `start()`, `stop()`, `onConfigUpdate(config)`
- Each strategy runs at its own cadence via `setInterval` or event-driven websocket:
  - DCA Accumulator: every 30s
  - Swing Trading: every 60s
  - Scalping: every 15s
  - Sniping: event-driven (Helius websocket)
  - Copy Trading: event-driven (Helius websocket)
  - Perps (Drift): every 30s
- `StrategyRunner` subscribes to Supabase `strategies` realtime — dashboard toggle or config update hot-reloads that strategy without process restart
- Per-strategy crash is caught and logged; other strategies keep running
- Global bot ON/OFF from `bot_state` halts all strategies

### File: `bot/src/strategies/base.ts`

```typescript
export interface StrategyConfig {
  id: string;
  name: string;
  enabled: boolean;
  wallet_id: string;
  config: Record<string, unknown>;
}

export abstract class BaseStrategy {
  abstract name: string;
  abstract start(config: StrategyConfig): Promise<void>;
  abstract stop(): Promise<void>;
  abstract onConfigUpdate(config: StrategyConfig): Promise<void>;
}
```

### File: `bot/src/strategies/runner.ts`

- Loads all strategies from Supabase on boot
- Instantiates and starts each enabled strategy
- Subscribes to `strategies` table realtime for hot-reload
- Catches per-strategy errors, logs, restarts after 10s backoff

---

## 2. All 6 Strategies

### Strategy 1 — DCA Accumulator (`bot/src/strategies/dca.ts`)

**Config fields:**
- `token_mint` — token to accumulate
- `entry_size_usd` — initial buy size in USD
- `dca_size_usd` — rebuy size per dip
- `dip_trigger_pct` — dip % below last buy to trigger rebuy (e.g. 5)
- `take_profit_pct` — % above average entry to sell full position (e.g. 15)
- `max_buys` — maximum number of DCA buys (safety cap)

**Logic:**
1. On start, buy `entry_size_usd` via Jupiter, record position in Supabase
2. Every 30s, fetch current price
3. If price ≤ last_buy_price × (1 - dip_trigger_pct/100) AND buy_count < max_buys → buy `dca_size_usd`, update average entry
4. If current price ≥ average_entry × (1 + take_profit_pct/100) → sell full position via Jupiter, record trade
5. Manual "Sell All" command from dashboard triggers immediate full sell

### Strategy 2 — Swing Trading (`bot/src/strategies/swing.ts`)

**Config fields:**
- `token_mint`, `fast_ema`, `slow_ema` (e.g. 9, 21)
- `rsi_period` (e.g. 14), `rsi_oversold` (e.g. 30), `rsi_overbought` (e.g. 70)
- `position_size_usd`, `stop_loss_pct`, `take_profit_pct`

**Logic:**
1. Every 60s, fetch OHLCV from Birdeye (last 100 candles)
2. Calculate EMA-fast, EMA-slow, RSI
3. Entry signal: EMA-fast crosses above EMA-slow AND RSI < rsi_oversold → Jupiter buy
4. Exit signal: EMA-fast crosses below EMA-slow OR RSI > rsi_overbought → Jupiter sell
5. SL/TP handled by Risk Manager monitor loop

### Strategy 3 — Scalping (`bot/src/strategies/scalping.ts`)

**Config fields:**
- `token_mint`, `position_size_usd`
- `volume_multiplier` — volume spike threshold (e.g. 3× 5-min average)
- `profit_target_pct`, `stop_loss_pct`
- `max_hold_seconds` — auto-close timer (e.g. 300)

**Logic:**
1. Every 15s, fetch recent trade volume from Birdeye
2. If current volume > volume_multiplier × 5-min average → entry signal → Jupiter buy
3. SL/TP and max_hold_seconds managed by Risk Manager monitor loop
4. Only one open scalp position at a time per strategy instance

### Strategy 4 — Sniping (`bot/src/strategies/sniper.ts`)

**Config fields:**
- `max_buy_usd`, `take_profit_pct`, `auto_sell_seconds`
- `min_liquidity_usd` — minimum pool liquidity to qualify
- `min_rugcheck_score` — RugCheck API minimum score (0–100)

**Logic:**
1. Helius websocket subscribes to Raydium AMM program logs for pool init events
2. On new pool detected:
   a. Fetch pool info (token mints, initial liquidity)
   b. Check liquidity ≥ min_liquidity_usd
   c. Call RugCheck API, verify score ≥ min_rugcheck_score
   d. Verify mint authority is renounced
3. If all checks pass → buy via Jupiter (fastest route)
4. Start auto-sell timer; if TP not hit within auto_sell_seconds → force sell

### Strategy 5 — Copy Trading (`bot/src/strategies/copyTrade.ts`)

**Config fields:**
- `target_wallet` — Solana address to mirror
- `max_copy_size_usd` — maximum size per replicated trade
- `token_blacklist` — array of mint addresses to skip

**Logic:**
1. Helius websocket subscribes to target_wallet account notifications
2. On any swap transaction detected, parse Jupiter or Raydium swap instruction
3. Extract: token_in, token_out, amount_in
4. If token_out not in blacklist → replicate swap via Jupiter, capped at max_copy_size_usd
5. Record position in Supabase, send Telegram alert

### Strategy 6 — Perps / Drift (`bot/src/strategies/perps.ts`)

**Config fields:**
- `market` — e.g. "SOL-PERP", "BTC-PERP", "ETH-PERP"
- `direction` — "long" | "short"
- `leverage` — 1–20
- `position_size_usd`
- `entry_mode` — "manual" | "signal"
- `stop_loss_pct`, `take_profit_pct`
- `rsi_period`, `rsi_oversold`, `rsi_overbought` (only if entry_mode = "signal")

**Logic:**
1. If entry_mode = "signal": every 30s fetch OHLCV, apply EMA+RSI logic same as Swing
2. If entry_mode = "manual": waits for dashboard trigger via `bot_state.manual_trigger` field
3. Open position via Drift SDK: `driftClient.openPosition(market, direction, size, leverage)`
4. Every 30s: check mark price vs entry, compute unrealized PnL, check proximity to liquidation price
5. SL/TP managed by Risk Manager (Drift close position call)

---

## 3. Risk Manager

### File: `bot/src/risk/riskManager.ts`

Shared class, all strategies call it before executing any trade.

**Pre-trade checks (rejects trade if any fail):**
- `max_position_size_pct` — trade size cannot exceed X% of assigned wallet balance
- `max_open_positions` — reject if open position count ≥ limit
- `daily_loss_limit_usd` — reject + pause all strategies if today's realized losses exceed limit
- `circuit_breaker_losses` — stop all strategies + Telegram alert after N consecutive losses

**SL/TP monitor loop** — runs every 5s, queries all open positions from Supabase, checks current price against each position's stop_loss and take_profit thresholds. Fires Jupiter sell (spot) or Drift close (perps) when triggered.

**All thresholds configurable from dashboard** — stored in `bot_state.risk_config` JSONB column.

### SQL addition

```sql
ALTER TABLE bot_state ADD COLUMN IF NOT EXISTS risk_config JSONB DEFAULT '{
  "max_position_size_pct": 10,
  "max_open_positions": 10,
  "daily_loss_limit_usd": 100,
  "circuit_breaker_losses": 5
}'::jsonb;
```

### Files:
- `bot/src/risk/riskManager.ts` — pre-trade guard
- `bot/src/risk/stopLoss.ts` — 5s SL/TP monitor loop
- `bot/src/risk/circuitBreaker.ts` — consecutive loss counter + kill-switch

---

## 4. Dashboard — Strategy Config Panels

Each strategy card on `/strategies` gets a fully expanded settings panel.

### Per-strategy panel:
- ON/OFF toggle (existing)
- **Wallet assignment** — dropdown of active wallets, selection stored in `strategies.wallet_id`
- **Strategy-specific settings** — all config fields from Section 2, rendered as form inputs
- **Risk override** — optional per-strategy position size cap
- Save button writes to `strategies.config` JSONB → bot hot-reloads via realtime subscription

### Visual indicators per card:
- Status badge: idle / running / paused / error
- Assigned wallet label
- Open position count for that strategy

### Files:
- `dashboard/components/strategies/strategy-config-panel.tsx` — expandable settings form
- `dashboard/components/strategies/wallet-selector.tsx` — wallet assignment dropdown
- `dashboard/app/api/strategies/[id]/route.ts` — PATCH endpoint to update strategy config

---

## 5. Dashboard — Spot Page (`/spot`)

### Manual Swap Form:
- Token in/out selectors (popular Solana tokens + custom mint input)
- Amount input
- Slippage tolerance selector (0.5%, 1%, custom)
- Calls Jupiter quote API on input change → shows expected output + price impact
- "Swap" button calls `/api/swap` route which executes via bot engine or direct Jupiter call

### DCA Accumulator Panel:
- Active DCA positions table: token, average entry, total invested, current value, unrealized PnL %
- "Sell All" button per position → calls `/api/dca/sell` → writes manual sell command to Supabase

### Open Spot Positions:
- Live table from Supabase realtime: token, entry price, current price, PnL %, strategy tag, wallet

### Files:
- `dashboard/app/(app)/spot/page.tsx`
- `dashboard/components/spot/swap-form.tsx`
- `dashboard/components/spot/dca-positions.tsx`
- `dashboard/components/spot/spot-positions.tsx`
- `dashboard/app/api/swap/route.ts`
- `dashboard/app/api/dca/sell/route.ts`

---

## 6. Dashboard — Perps Page (`/perps`)

### Open Position Form:
- Market selector: SOL-PERP, BTC-PERP, ETH-PERP
- Direction toggle: Long / Short
- Size input (USD)
- Leverage slider: 1× – 20×
- Estimated liquidation price shown live (computed client-side)
- "Open Position" button → calls `/api/perps/open`

### Open Drift Positions Table:
- Live from Supabase realtime: market, direction, size, entry price, mark price, unrealized PnL, margin ratio, liquidation price
- "Close" button per position → calls `/api/perps/close`

### Account Stats Bar:
- Total collateral, free collateral, account health %
- Fetched from Drift SDK via `/api/perps/account`

### Files:
- `dashboard/app/(app)/perps/page.tsx`
- `dashboard/components/perps/open-position-form.tsx`
- `dashboard/components/perps/perps-positions.tsx`
- `dashboard/components/perps/account-stats.tsx`
- `dashboard/app/api/perps/open/route.ts`
- `dashboard/app/api/perps/close/route.ts`
- `dashboard/app/api/perps/account/route.ts`

---

## 7. Data Model Changes

Only one SQL change needed:

```sql
-- Add risk_config to bot_state
ALTER TABLE bot_state
ADD COLUMN IF NOT EXISTS risk_config JSONB DEFAULT '{
  "max_position_size_pct": 10,
  "max_open_positions": 10,
  "daily_loss_limit_usd": 100,
  "circuit_breaker_losses": 5
}'::jsonb;

-- Add wallet_id to strategies (if not already present)
ALTER TABLE strategies
ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id);

-- Add manual_trigger to bot_state for dashboard-triggered perps entries
ALTER TABLE bot_state
ADD COLUMN IF NOT EXISTS manual_trigger JSONB DEFAULT NULL;
```

The existing `strategies.config` JSONB column stores all per-strategy settings. No new tables needed.

---

## 8. Security

- Bot strategies only execute if `bot_state.is_running = true`
- All private key decryption happens in bot engine only, never in dashboard API routes
- Dashboard API routes for `/api/swap`, `/api/perps/*` write intent to Supabase; bot engine picks up and executes (prevents key exposure to Vercel edge functions)
- Risk Manager acts as last-line guard before any trade regardless of source

---

## 9. Out of Scope (Plan B)

- Backtesting
- Mobile UI
- Multi-user
- Raydium Perps direct (no SDK)
- Manual trade entry for Swing/Scalping (bot-automated only)
