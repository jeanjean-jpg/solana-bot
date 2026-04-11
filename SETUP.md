# SolBot Setup Guide

## 1. Supabase
1. Create a new project at supabase.com
2. Go to SQL Editor → paste contents of `supabase/migrations/001_initial_schema.sql` → Run
3. Go to Project Settings → API → copy URL and anon key

## 2. Helius RPC
1. Sign up at helius.dev
2. Create an API key
3. Your RPC URL: `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY`

## 3. Telegram Bot (optional)
1. Message @BotFather on Telegram → /newbot
2. Copy the bot token
3. Start a chat with your bot, then get your chat ID from: `https://api.telegram.org/bot<TOKEN>/getUpdates`

## 4. Dashboard (Vercel)
1. Push this repo to GitHub
2. Go to vercel.com → New Project → Import repo
3. Set Root Directory to `dashboard`
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `WALLET_ENCRYPTION_KEY` (generate: any random 32-character string)
5. Deploy

## 5. Bot Engine (Railway)
1. Go to railway.app → New Project → Deploy from GitHub repo
2. Set Root Directory to `bot`
3. Add environment variables (all from `bot/.env.example`):
   - `HELIUS_API_KEY`
   - `HELIUS_RPC_URL`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `WALLET_ENCRYPTION_KEY` (MUST match the one in Vercel)
   - `TELEGRAM_BOT_TOKEN` (optional)
   - `TELEGRAM_CHAT_ID` (optional)
4. Deploy

## 6. Add a Trading Wallet
1. Open your Vercel dashboard URL
2. Set your PIN (first time)
3. Go to Wallets → Add Trading Wallet
4. Paste your burner wallet private key (base58 format)
5. ⚠️ NEVER use your main wallet. Fund a dedicated wallet with small amounts only.

## 7. Test It
1. Go to Overview → click START
2. Check Railway logs — should see "Bot is enabled"
3. If Telegram configured, you should receive 🟢 SolBot started

## Wallet Security
- Private keys are XOR-obfuscated before storage in Supabase
- Never commit .env files
- Use a dedicated burner wallet with only the SOL you need for trading
- Sweep profits to cold storage regularly using the Wallets page
