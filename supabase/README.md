# Supabase Setup

Run the migration in your Supabase project:

1. Go to your Supabase project → SQL Editor
2. Paste the contents of `migrations/001_initial_schema.sql`
3. Click Run

Tables created:
- `wallets` — encrypted trading wallet keypairs
- `bot_state` — single-row bot ON/OFF state + heartbeat
- `strategies` — per-strategy config and enabled/disabled flag
- `positions` — open trading positions (real-time enabled)
- `trades` — completed trade history (real-time enabled)
- `alerts` — Telegram alert log
