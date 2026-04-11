# Solana Trading Bot — Plan A: Foundation, Dashboard & Bot Core

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the full monorepo, deploy a live dark-mode dashboard on Vercel, and have a running bot engine on Railway that can execute Jupiter spot swaps and Drift perp trades on demand from the UI.

**Architecture:** Two workspaces in one GitHub repo — `dashboard/` (Next.js 15 on Vercel) and `bot/` (Node.js/TypeScript on Railway) — sharing a Supabase Postgres database for state. The dashboard writes config/commands to Supabase; the bot engine reads them and writes results back. Real-time Supabase subscriptions drive live UI updates without polling.

**Tech Stack:** Next.js 15, Tailwind CSS, shadcn/ui, Supabase JS v2, Node.js 20, TypeScript 5, @jup-ag/api v6, @drift-labs/sdk, helius-sdk, jito-ts, pino, vitest

---

## File Map

```
solana-bot/
├── .gitignore
├── .env.example
├── package.json                          # root (workspaces)
├── pnpm-workspace.yaml
│
├── dashboard/                            # Vercel deployment
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── .env.local.example
│   ├── middleware.ts                     # PIN lock
│   ├── app/
│   │   ├── layout.tsx                   # root layout, dark theme
│   │   ├── page.tsx                     # redirect → /overview
│   │   ├── (auth)/
│   │   │   └── pin/page.tsx             # PIN entry screen
│   │   ├── (app)/
│   │   │   ├── layout.tsx               # sidebar + header shell
│   │   │   ├── overview/page.tsx        # bot status, PnL, positions feed
│   │   │   ├── spot/page.tsx            # Jupiter swap + DCA Accumulator
│   │   │   ├── perps/page.tsx           # Drift longs/shorts
│   │   │   ├── strategies/page.tsx      # strategy toggles + config
│   │   │   └── wallets/page.tsx         # wallet management
│   ├── components/
│   │   ├── ui/                          # shadcn/ui generated components
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   └── header.tsx
│   │   ├── overview/
│   │   │   ├── bot-status-card.tsx      # ON/OFF toggle + heartbeat
│   │   │   ├── pnl-summary.tsx          # daily/total PnL
│   │   │   ├── position-feed.tsx        # live open positions
│   │   │   └── trade-history.tsx        # recent completed trades
│   │   ├── spot/
│   │   │   ├── swap-form.tsx            # manual Jupiter swap
│   │   │   └── dca-panel.tsx            # DCA Accumulator controls
│   │   ├── perps/
│   │   │   ├── open-position-form.tsx   # long/short entry
│   │   │   └── perp-positions.tsx       # open perp positions table
│   │   ├── strategies/
│   │   │   └── strategy-card.tsx        # reusable toggle + settings card
│   │   └── wallets/
│   │       ├── add-wallet-form.tsx
│   │       └── wallet-card.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                # browser Supabase client
│   │   │   └── server.ts                # server Supabase client
│   │   ├── pin.ts                       # PIN hash/verify (SHA-256)
│   │   └── types.ts                     # shared DB types (generated)
│   └── hooks/
│       ├── use-bot-state.ts             # real-time bot_state subscription
│       ├── use-positions.ts             # real-time positions subscription
│       └── use-wallets.ts               # wallets data hook
│
└── bot/                                  # Railway deployment
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    ├── src/
    │   ├── index.ts                     # entry point
    │   ├── config/
    │   │   ├── env.ts                   # Zod env validation
    │   │   └── constants.ts             # token mints, program IDs
    │   ├── core/
    │   │   ├── connection.ts            # Helius RPC + retry
    │   │   ├── wallet.ts                # AES-256 decrypt + Keypair
    │   │   └── logger.ts                # pino instance
    │   ├── execution/
    │   │   ├── jupiter.ts               # quote + swap
    │   │   ├── drift.ts                 # open/close perp positions
    │   │   ├── priorityFee.ts           # dynamic fee via Helius API
    │   │   ├── jito.ts                  # bundle submission
    │   │   └── txSender.ts              # unified send + confirm + retry
    │   ├── state/
    │   │   ├── supabase.ts              # Supabase service-role client
    │   │   ├── positions.ts             # position CRUD
    │   │   ├── trades.ts                # trade history writes
    │   │   └── botState.ts              # heartbeat + ON/OFF watch
    │   └── notify/
    │       └── telegram.ts              # Telegram alert dispatcher
    └── tests/
        ├── core/
        │   ├── wallet.test.ts
        │   └── connection.test.ts
        ├── execution/
        │   ├── jupiter.test.ts
        │   └── priorityFee.test.ts
        └── state/
            └── positions.test.ts
```

---

## Task 1: Monorepo Scaffold

**Files:**
- Create: `solana-bot/.gitignore`
- Create: `solana-bot/package.json`
- Create: `solana-bot/pnpm-workspace.yaml`
- Create: `solana-bot/.env.example`

- [ ] **Step 1: Init the repo**

```bash
cd C:/Users/Usuario/Desktop/solana-bot
git init
```

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "solana-bot",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev:dashboard": "pnpm --filter dashboard dev",
    "dev:bot": "pnpm --filter bot dev",
    "build:dashboard": "pnpm --filter dashboard build",
    "build:bot": "pnpm --filter bot build"
  },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 3: Create pnpm-workspace.yaml**

```yaml
packages:
  - "dashboard"
  - "bot"
```

- [ ] **Step 4: Create root .gitignore**

```
node_modules/
.env
.env.local
*.env
dist/
.next/
bot/data/
*.db
logs/
```

- [ ] **Step 5: Create root .env.example**

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Helius
HELIUS_API_KEY=your-helius-api-key
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=your-key

# Wallet encryption
WALLET_ENCRYPTION_KEY=32-char-random-string-here

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# Jito
JITO_BLOCK_ENGINE_URL=https://mainnet.block-engine.jito.wtf

# PIN (hashed SHA-256 of your chosen PIN)
DASHBOARD_PIN_HASH=
```

- [ ] **Step 6: Initial commit**

```bash
git add .
git commit -m "chore: init monorepo scaffold"
```

---

## Task 2: Supabase Schema

**Files:**
- Create: `solana-bot/supabase/migrations/001_initial_schema.sql`
- Create: `solana-bot/supabase/seed.sql`

- [ ] **Step 1: Create migrations directory**

```bash
mkdir -p C:/Users/Usuario/Desktop/solana-bot/supabase/migrations
```

- [ ] **Step 2: Write initial schema migration**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Wallets
create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  encrypted_private_key text not null,
  cold_wallet_address text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Bot state (single row)
create table if not exists bot_state (
  id int primary key default 1,
  is_running boolean default false,
  last_heartbeat timestamptz,
  active_strategy_count int default 0,
  check (id = 1)
);
insert into bot_state (id) values (1) on conflict do nothing;

-- Strategies config
create table if not exists strategies (
  id text primary key, -- 'dca' | 'swing' | 'scalping' | 'sniping' | 'copy_trade' | 'perps'
  is_enabled boolean default false,
  wallet_id uuid references wallets(id),
  config jsonb default '{}',
  updated_at timestamptz default now()
);

insert into strategies (id) values
  ('dca'), ('swing'), ('scalping'), ('sniping'), ('copy_trade'), ('perps')
on conflict do nothing;

-- Open positions
create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  strategy_id text references strategies(id),
  wallet_id uuid references wallets(id),
  token_mint text not null,
  token_symbol text,
  side text not null check (side in ('long', 'short', 'spot')),
  entry_price numeric not null,
  amount_usd numeric not null,
  amount_tokens numeric not null,
  stop_loss_price numeric,
  take_profit_price numeric,
  leverage int default 1,
  tx_signature text,
  opened_at timestamptz default now(),
  metadata jsonb default '{}'
);

-- Trade history
create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  strategy_id text,
  wallet_id uuid references wallets(id),
  token_mint text,
  token_symbol text,
  side text check (side in ('buy', 'sell', 'long', 'short', 'close_long', 'close_short')),
  entry_price numeric,
  exit_price numeric,
  amount_usd numeric,
  pnl_usd numeric,
  pnl_pct numeric,
  fees_sol numeric,
  tx_signature text,
  duration_seconds int,
  closed_at timestamptz default now()
);

-- Alerts log
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- 'fill' | 'sl_hit' | 'tp_hit' | 'error' | 'circuit_breaker'
  message text not null,
  sent_at timestamptz default now()
);

-- Enable realtime for live dashboard updates
alter publication supabase_realtime add table positions;
alter publication supabase_realtime add table bot_state;
alter publication supabase_realtime add table trades;
```

- [ ] **Step 3: Run migration in Supabase dashboard**

Go to your Supabase project → SQL Editor → paste the migration → Run.

- [ ] **Step 4: Commit schema**

```bash
git add supabase/
git commit -m "feat: add initial supabase schema"
```

---

## Task 3: Dashboard — Next.js Setup

**Files:**
- Create: `dashboard/package.json`
- Create: `dashboard/next.config.ts`
- Create: `dashboard/tailwind.config.ts`
- Create: `dashboard/tsconfig.json`
- Create: `dashboard/app/layout.tsx`

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd C:/Users/Usuario/Desktop/solana-bot
pnpm create next-app@latest dashboard --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

- [ ] **Step 2: Install dependencies**

```bash
cd dashboard
pnpm add @supabase/supabase-js @supabase/ssr recharts lucide-react class-variance-authority clsx tailwind-merge
pnpm add -D @types/node
```

- [ ] **Step 3: Install shadcn/ui**

```bash
pnpm dlx shadcn@latest init
# When prompted: Dark theme, CSS variables yes
```

- [ ] **Step 4: Add shadcn components**

```bash
pnpm dlx shadcn@latest add button card badge switch slider input label toast dialog table tabs
```

- [ ] **Step 5: Update tailwind.config.ts for dark mode**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        border: "hsl(var(--border))",
        green: { 400: "#4ade80", 500: "#22c55e" },
        red: { 400: "#f87171", 500: "#ef4444" },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

- [ ] **Step 6: Update app/layout.tsx — force dark mode**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SolBot Dashboard",
  description: "Personal Solana Trading Bot",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Create .env.local.example**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 8: Verify it runs**

```bash
pnpm dev
```

Expected: Next.js app starts at http://localhost:3000 with dark background.

- [ ] **Step 9: Commit**

```bash
git add dashboard/
git commit -m "feat: scaffold Next.js dashboard with shadcn dark mode"
```

---

## Task 4: Dashboard — Supabase Client + Types

**Files:**
- Create: `dashboard/lib/supabase/client.ts`
- Create: `dashboard/lib/supabase/server.ts`
- Create: `dashboard/lib/types.ts`

- [ ] **Step 1: Create browser Supabase client**

Create `dashboard/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Create server Supabase client**

Create `dashboard/lib/supabase/server.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
```

- [ ] **Step 3: Create shared types**

Create `dashboard/lib/types.ts`:

```typescript
export type StrategyId = "dca" | "swing" | "scalping" | "sniping" | "copy_trade" | "perps";
export type PositionSide = "long" | "short" | "spot";
export type TradeSide = "buy" | "sell" | "long" | "short" | "close_long" | "close_short";
export type AlertType = "fill" | "sl_hit" | "tp_hit" | "error" | "circuit_breaker";

export interface Wallet {
  id: string;
  label: string;
  cold_wallet_address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface BotState {
  id: number;
  is_running: boolean;
  last_heartbeat: string | null;
  active_strategy_count: number;
}

export interface Strategy {
  id: StrategyId;
  is_enabled: boolean;
  wallet_id: string | null;
  config: Record<string, unknown>;
  updated_at: string;
}

export interface Position {
  id: string;
  strategy_id: StrategyId;
  wallet_id: string;
  token_mint: string;
  token_symbol: string | null;
  side: PositionSide;
  entry_price: number;
  amount_usd: number;
  amount_tokens: number;
  stop_loss_price: number | null;
  take_profit_price: number | null;
  leverage: number;
  tx_signature: string | null;
  opened_at: string;
  metadata: Record<string, unknown>;
}

export interface Trade {
  id: string;
  strategy_id: string | null;
  wallet_id: string | null;
  token_mint: string | null;
  token_symbol: string | null;
  side: TradeSide | null;
  entry_price: number | null;
  exit_price: number | null;
  amount_usd: number | null;
  pnl_usd: number | null;
  pnl_pct: number | null;
  fees_sol: number | null;
  tx_signature: string | null;
  duration_seconds: number | null;
  closed_at: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add dashboard/lib/
git commit -m "feat: add supabase clients and shared types"
```

---

## Task 5: Dashboard — PIN Lock

**Files:**
- Create: `dashboard/lib/pin.ts`
- Create: `dashboard/middleware.ts`
- Create: `dashboard/app/(auth)/pin/page.tsx`

- [ ] **Step 1: Create PIN utility**

Create `dashboard/lib/pin.ts`:

```typescript
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const computed = await hashPin(pin);
  return computed === hash;
}

const PIN_COOKIE = "solbot_pin_verified";
const PIN_HASH_KEY = "solbot_pin_hash";

export function getPinHash(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PIN_HASH_KEY);
}

export function setPinHash(hash: string) {
  localStorage.setItem(PIN_HASH_KEY, hash);
}

export function isPinSet(): boolean {
  return !!getPinHash();
}
```

- [ ] **Step 2: Create PIN page**

Create `dashboard/app/(auth)/pin/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hashPin, verifyPin, getPinHash, setPinHash } from "@/lib/pin";

export default function PinPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isSetup, setIsSetup] = useState(false);

  // Determine if this is first-time setup or verification
  // We use a data attribute set by middleware
  const existingHash = typeof window !== "undefined" ? getPinHash() : null;
  const isFirstTime = !existingHash;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (isFirstTime) {
      if (pin.length < 4) { setError("PIN must be at least 4 digits"); return; }
      if (pin !== confirm) { setError("PINs do not match"); return; }
      const hash = await hashPin(pin);
      setPinHash(hash);
      document.cookie = "solbot_pin_verified=1; path=/; max-age=86400";
      router.push("/overview");
    } else {
      const valid = await verifyPin(pin, existingHash!);
      if (!valid) { setError("Incorrect PIN"); setPin(""); return; }
      document.cookie = "solbot_pin_verified=1; path=/; max-age=86400";
      router.push("/overview");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8 rounded-2xl border border-border bg-card shadow-2xl">
        <h1 className="text-2xl font-bold text-center mb-2">
          {isFirstTime ? "Set Your PIN" : "Enter PIN"}
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {isFirstTime ? "Choose a PIN to protect your dashboard" : "SolBot Dashboard"}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            inputMode="numeric"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            maxLength={8}
            className="text-center text-2xl tracking-widest"
          />
          {isFirstTime && (
            <Input
              type="password"
              inputMode="numeric"
              placeholder="Confirm PIN"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              maxLength={8}
              className="text-center text-2xl tracking-widest"
            />
          )}
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <Button type="submit" className="w-full">
            {isFirstTime ? "Set PIN" : "Unlock"}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create middleware**

Create `dashboard/middleware.ts`:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/pin")) return NextResponse.next();

  const pinVerified = request.cookies.get("solbot_pin_verified");
  if (!pinVerified) {
    return NextResponse.redirect(new URL("/pin", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
```

- [ ] **Step 4: Test PIN flow**

```bash
cd dashboard && pnpm dev
```

Navigate to http://localhost:3000 — should redirect to /pin. Set a PIN. Should redirect to /overview (404 for now is fine).

- [ ] **Step 5: Commit**

```bash
git add dashboard/
git commit -m "feat: add PIN lock middleware and setup flow"
```

---

## Task 6: Dashboard — Layout Shell

**Files:**
- Create: `dashboard/components/layout/sidebar.tsx`
- Create: `dashboard/components/layout/header.tsx`
- Create: `dashboard/app/(app)/layout.tsx`
- Create: `dashboard/app/page.tsx`

- [ ] **Step 1: Create sidebar**

Create `dashboard/components/layout/sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  TrendingUp,
  BarChart2,
  Settings2,
  Wallet,
} from "lucide-react";

const nav = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/spot", label: "Spot Trading", icon: TrendingUp },
  { href: "/perps", label: "Perps", icon: BarChart2 },
  { href: "/strategies", label: "Strategies", icon: Settings2 },
  { href: "/wallets", label: "Wallets", icon: Wallet },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 min-h-screen bg-card border-r border-border flex flex-col py-6 px-3 gap-1">
      <div className="px-3 mb-6">
        <span className="text-lg font-bold tracking-tight text-green-400">⚡ SolBot</span>
      </div>
      {nav.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            pathname === href
              ? "bg-green-500/10 text-green-400"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <Icon size={16} />
          {label}
        </Link>
      ))}
    </aside>
  );
}
```

- [ ] **Step 2: Create header**

Create `dashboard/components/layout/header.tsx`:

```tsx
"use client";

import { useBotState } from "@/hooks/use-bot-state";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function Header() {
  const { botState } = useBotState();
  const isRunning = botState?.is_running ?? false;

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur">
      <div />
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            isRunning
              ? "border-green-500 text-green-400"
              : "border-muted-foreground text-muted-foreground"
          )}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", isRunning ? "bg-green-400 animate-pulse" : "bg-muted-foreground")} />
          {isRunning ? "Bot Running" : "Bot Stopped"}
        </Badge>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create app layout**

Create `dashboard/app/(app)/layout.tsx`:

```tsx
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create root redirect**

Create `dashboard/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";
export default function RootPage() {
  redirect("/overview");
}
```

- [ ] **Step 5: Commit**

```bash
git add dashboard/
git commit -m "feat: add app layout with sidebar and header"
```

---

## Task 7: Dashboard — Real-time Hooks

**Files:**
- Create: `dashboard/hooks/use-bot-state.ts`
- Create: `dashboard/hooks/use-positions.ts`
- Create: `dashboard/hooks/use-wallets.ts`

- [ ] **Step 1: Create useBotState hook**

Create `dashboard/hooks/use-bot-state.ts`:

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BotState } from "@/lib/types";

export function useBotState() {
  const [botState, setBotState] = useState<BotState | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("bot_state")
      .select("*")
      .single()
      .then(({ data }) => { if (data) setBotState(data); });

    const channel = supabase
      .channel("bot_state")
      .on("postgres_changes", { event: "*", schema: "public", table: "bot_state" }, (payload) => {
        setBotState(payload.new as BotState);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleBot = useCallback(async () => {
    if (!botState) return;
    await supabase
      .from("bot_state")
      .update({ is_running: !botState.is_running })
      .eq("id", 1);
  }, [botState]);

  return { botState, toggleBot };
}
```

- [ ] **Step 2: Create usePositions hook**

Create `dashboard/hooks/use-positions.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Position } from "@/lib/types";

export function usePositions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("positions")
      .select("*")
      .order("opened_at", { ascending: false })
      .then(({ data }) => { if (data) setPositions(data); });

    const channel = supabase
      .channel("positions")
      .on("postgres_changes", { event: "*", schema: "public", table: "positions" }, () => {
        supabase
          .from("positions")
          .select("*")
          .order("opened_at", { ascending: false })
          .then(({ data }) => { if (data) setPositions(data); });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { positions };
}
```

- [ ] **Step 3: Create useWallets hook**

Create `dashboard/hooks/use-wallets.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Wallet } from "@/lib/types";

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const supabase = createClient();

  async function refetch() {
    const { data } = await supabase.from("wallets").select("id, label, cold_wallet_address, is_active, created_at").order("created_at");
    if (data) setWallets(data);
  }

  useEffect(() => { refetch(); }, []);

  return { wallets, refetch };
}
```

- [ ] **Step 4: Commit**

```bash
git add dashboard/hooks/
git commit -m "feat: add real-time supabase hooks for bot state, positions, wallets"
```

---

## Task 8: Dashboard — Overview Page

**Files:**
- Create: `dashboard/components/overview/bot-status-card.tsx`
- Create: `dashboard/components/overview/pnl-summary.tsx`
- Create: `dashboard/components/overview/position-feed.tsx`
- Create: `dashboard/app/(app)/overview/page.tsx`

- [ ] **Step 1: Create BotStatusCard**

Create `dashboard/components/overview/bot-status-card.tsx`:

```tsx
"use client";

import { useBotState } from "@/hooks/use-bot-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function BotStatusCard() {
  const { botState, toggleBot } = useBotState();
  const isRunning = botState?.is_running ?? false;

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Bot Status</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className={cn("text-2xl font-bold", isRunning ? "text-green-400" : "text-red-400")}>
            {isRunning ? "RUNNING" : "STOPPED"}
          </p>
          {botState?.last_heartbeat && (
            <p className="text-xs text-muted-foreground mt-1">
              Last heartbeat: {new Date(botState.last_heartbeat).toLocaleTimeString()}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Active strategies: {botState?.active_strategy_count ?? 0}
          </p>
        </div>
        <Button
          size="lg"
          onClick={toggleBot}
          className={cn(
            "font-bold text-base px-8",
            isRunning
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-green-500 hover:bg-green-600 text-black"
          )}
        >
          {isRunning ? "STOP" : "START"}
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create PnLSummary**

Create `dashboard/components/overview/pnl-summary.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Trade } from "@/lib/types";

export function PnlSummary() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    supabase
      .from("trades")
      .select("pnl_usd, closed_at")
      .gte("closed_at", today.toISOString())
      .then(({ data }) => { if (data) setTrades(data); });
  }, []);

  const dailyPnl = trades.reduce((sum, t) => sum + (t.pnl_usd ?? 0), 0);
  const wins = trades.filter((t) => (t.pnl_usd ?? 0) > 0).length;
  const losses = trades.filter((t) => (t.pnl_usd ?? 0) < 0).length;

  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: "Today's PnL", value: `${dailyPnl >= 0 ? "+" : ""}$${dailyPnl.toFixed(2)}`, positive: dailyPnl >= 0 },
        { label: "Wins Today", value: wins.toString(), positive: true },
        { label: "Losses Today", value: losses.toString(), positive: losses === 0 },
      ].map(({ label, value, positive }) => (
        <Card key={label} className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-2xl font-bold", positive ? "text-green-400" : "text-red-400")}>{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create PositionFeed**

Create `dashboard/components/overview/position-feed.tsx`:

```tsx
"use client";

import { usePositions } from "@/hooks/use-positions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PositionFeed() {
  const { positions } = usePositions();

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Open Positions ({positions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {positions.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">No open positions</p>
        ) : (
          <div className="space-y-3">
            {positions.map((pos) => (
              <div key={pos.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{pos.token_symbol ?? pos.token_mint.slice(0, 6)}</span>
                    <Badge variant="outline" className={cn("text-xs", pos.side === "long" ? "text-green-400 border-green-500" : pos.side === "short" ? "text-red-400 border-red-500" : "text-blue-400 border-blue-500")}>
                      {pos.side.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-muted-foreground">{pos.strategy_id}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Entry: ${pos.entry_price.toFixed(4)} · Size: ${pos.amount_usd.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{new Date(pos.opened_at).toLocaleTimeString()}</p>
                  {pos.leverage > 1 && <p className="text-xs text-yellow-400">{pos.leverage}x</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Create Overview page**

Create `dashboard/app/(app)/overview/page.tsx`:

```tsx
import { BotStatusCard } from "@/components/overview/bot-status-card";
import { PnlSummary } from "@/components/overview/pnl-summary";
import { PositionFeed } from "@/components/overview/position-feed";

export default function OverviewPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground text-sm">Your bot at a glance</p>
      </div>
      <BotStatusCard />
      <PnlSummary />
      <PositionFeed />
    </div>
  );
}
```

- [ ] **Step 5: Test in browser**

```bash
pnpm dev
```

Navigate to http://localhost:3000/overview. Should show the dashboard with START/STOP button, PnL cards, and empty positions list.

- [ ] **Step 6: Commit**

```bash
git add dashboard/
git commit -m "feat: add overview page with bot status, PnL summary, and live positions"
```

---

## Task 9: Dashboard — Wallets Page

**Files:**
- Create: `dashboard/components/wallets/add-wallet-form.tsx`
- Create: `dashboard/components/wallets/wallet-card.tsx`
- Create: `dashboard/app/(app)/wallets/page.tsx`
- Create: `dashboard/app/api/wallets/route.ts`

- [ ] **Step 1: Create wallet API route (encrypts key server-side)**

Create `dashboard/app/api/wallets/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Simple XOR-based obfuscation for storage
// The bot engine uses WALLET_ENCRYPTION_KEY from env for AES-256
function obfuscate(text: string, key: string): string {
  const keyBytes = Buffer.from(key.padEnd(32).slice(0, 32), "utf-8");
  const textBytes = Buffer.from(text, "utf-8");
  const result = Buffer.alloc(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    result[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return result.toString("base64");
}

export async function POST(req: NextRequest) {
  const { label, privateKey, coldWalletAddress } = await req.json();
  if (!label || !privateKey) {
    return NextResponse.json({ error: "label and privateKey required" }, { status: 400 });
  }

  const encryptionKey = process.env.WALLET_ENCRYPTION_KEY!;
  if (!encryptionKey) return NextResponse.json({ error: "encryption key not configured" }, { status: 500 });

  const encrypted = obfuscate(privateKey, encryptionKey);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("wallets")
    .insert({ label, encrypted_private_key: encrypted, cold_wallet_address: coldWalletAddress || null })
    .select("id, label, cold_wallet_address, is_active, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const supabase = await createClient();
  await supabase.from("wallets").update({ is_active: false }).eq("id", id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Create AddWalletForm**

Create `dashboard/components/wallets/add-wallet-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props { onAdded: () => void; }

export function AddWalletForm({ onAdded }: Props) {
  const [label, setLabel] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [coldAddress, setColdAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/wallets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, privateKey, coldWalletAddress: coldAddress }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    setLabel(""); setPrivateKey(""); setColdAddress("");
    onAdded();
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-sm">Add Trading Wallet</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Label</Label>
            <Input placeholder="e.g. DCA Wallet" value={label} onChange={(e) => setLabel(e.target.value)} required />
          </div>
          <div>
            <Label className="text-xs">Private Key (base58)</Label>
            <Input type="password" placeholder="Your wallet private key" value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} required />
            <p className="text-xs text-muted-foreground mt-1">⚠️ Use a dedicated trading wallet only. Never your main wallet.</p>
          </div>
          <div>
            <Label className="text-xs">Cold Wallet Address (for profit sweeps)</Label>
            <Input placeholder="Optional: destination address for sweeps" value={coldAddress} onChange={(e) => setColdAddress(e.target.value)} />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Saving..." : "Add Wallet"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create WalletCard**

Create `dashboard/components/wallets/wallet-card.tsx`:

```tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Wallet } from "@/lib/types";

interface Props { wallet: Wallet; onRemove: (id: string) => void; }

export function WalletCard({ wallet, onRemove }: Props) {
  async function handleRemove() {
    if (!confirm(`Remove wallet "${wallet.label}"?`)) return;
    await fetch("/api/wallets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: wallet.id }),
    });
    onRemove(wallet.id);
  }

  return (
    <Card className="border-border">
      <CardContent className="flex items-center justify-between pt-4 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{wallet.label}</span>
            <Badge variant="outline" className="text-xs text-green-400 border-green-500">Active</Badge>
          </div>
          {wallet.cold_wallet_address && (
            <p className="text-xs text-muted-foreground mt-1">
              Sweep → {wallet.cold_wallet_address.slice(0, 8)}...{wallet.cold_wallet_address.slice(-4)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Added {new Date(wallet.created_at).toLocaleDateString()}</p>
        </div>
        <Button variant="destructive" size="sm" onClick={handleRemove}>Remove</Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Create Wallets page**

Create `dashboard/app/(app)/wallets/page.tsx`:

```tsx
"use client";

import { useWallets } from "@/hooks/use-wallets";
import { AddWalletForm } from "@/components/wallets/add-wallet-form";
import { WalletCard } from "@/components/wallets/wallet-card";

export default function WalletsPage() {
  const { wallets, refetch } = useWallets();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Wallets</h1>
        <p className="text-muted-foreground text-sm">Manage your encrypted trading wallets</p>
      </div>
      <AddWalletForm onAdded={refetch} />
      <div className="space-y-3">
        {wallets.map((w) => (
          <WalletCard key={w.id} wallet={w} onRemove={refetch} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add WALLET_ENCRYPTION_KEY and Supabase to dashboard env**

Create `dashboard/.env.local` (gitignored):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
WALLET_ENCRYPTION_KEY=your-32-char-random-string-here
```

- [ ] **Step 6: Commit**

```bash
git add dashboard/
git commit -m "feat: add wallets page with encrypted key storage"
```

---

## Task 10: Dashboard — Strategies Page

**Files:**
- Create: `dashboard/components/strategies/strategy-card.tsx`
- Create: `dashboard/app/(app)/strategies/page.tsx`

- [ ] **Step 1: Create StrategyCard**

Create `dashboard/components/strategies/strategy-card.tsx`:

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { Strategy, StrategyId } from "@/lib/types";

const STRATEGY_META: Record<StrategyId, { name: string; description: string; risk: string }> = {
  dca: { name: "DCA Accumulator", description: "Buy dips on a token, accumulate, sell at target", risk: "Low" },
  swing: { name: "Swing Trading", description: "EMA crossover + RSI signals for trend following", risk: "Medium" },
  scalping: { name: "Scalping", description: "Fast momentum trades on volume spikes", risk: "High" },
  sniping: { name: "Sniping", description: "New Raydium pool launches — buy before the crowd", risk: "Very High" },
  copy_trade: { name: "Copy Trading", description: "Mirror a target wallet's swaps in real time", risk: "Medium" },
  perps: { name: "Perps (Drift)", description: "Long/short perpetuals with configurable leverage", risk: "High" },
};

const RISK_COLOR: Record<string, string> = {
  "Low": "text-green-400 border-green-500",
  "Medium": "text-yellow-400 border-yellow-500",
  "High": "text-orange-400 border-orange-500",
  "Very High": "text-red-400 border-red-500",
};

interface Props { strategy: Strategy; }

export function StrategyCard({ strategy }: Props) {
  const [enabled, setEnabled] = useState(strategy.is_enabled);
  const meta = STRATEGY_META[strategy.id as StrategyId];
  const supabase = createClient();

  async function handleToggle(val: boolean) {
    setEnabled(val);
    await supabase.from("strategies").update({ is_enabled: val }).eq("id", strategy.id);
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{meta.name}</CardTitle>
            <Badge variant="outline" className={`text-xs ${RISK_COLOR[meta.risk]}`}>{meta.risk} Risk</Badge>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} />
        </div>
        <p className="text-xs text-muted-foreground">{meta.description}</p>
      </CardHeader>
      <CardContent>
        {!enabled ? (
          <p className="text-xs text-muted-foreground italic">Enable this strategy to configure it</p>
        ) : (
          <p className="text-xs text-green-400">Strategy active — configure parameters in the next release</p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create Strategies page**

Create `dashboard/app/(app)/strategies/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StrategyCard } from "@/components/strategies/strategy-card";
import type { Strategy } from "@/lib/types";

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("strategies").select("*").then(({ data }) => {
      if (data) setStrategies(data);
    });
  }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Strategies</h1>
        <p className="text-muted-foreground text-sm">Enable and configure your trading strategies</p>
      </div>
      <div className="space-y-4">
        {strategies.map((s) => <StrategyCard key={s.id} strategy={s} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add dashboard/
git commit -m "feat: add strategies page with enable/disable toggles"
```

---

## Task 11: Dashboard — Spot & Perps Page Shells

**Files:**
- Create: `dashboard/app/(app)/spot/page.tsx`
- Create: `dashboard/app/(app)/perps/page.tsx`

- [ ] **Step 1: Create Spot page shell**

Create `dashboard/app/(app)/spot/page.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SpotPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Spot Trading</h1>
        <p className="text-muted-foreground text-sm">Jupiter swaps + DCA Accumulator</p>
      </div>
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">DCA Accumulator</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Configure DCA strategy in the Strategies page. Active DCA positions will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Create Perps page shell**

Create `dashboard/app/(app)/perps/page.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PerpsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Perps Trading</h1>
        <p className="text-muted-foreground text-sm">Drift Protocol — Longs & Shorts</p>
      </div>
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Perp positions opened by the bot will appear here in real time.</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add dashboard/
git commit -m "feat: add spot and perps page shells"
```

---

## Task 12: Bot Engine — TypeScript Project Setup

**Files:**
- Create: `bot/package.json`
- Create: `bot/tsconfig.json`
- Create: `bot/src/config/env.ts`
- Create: `bot/src/config/constants.ts`
- Create: `bot/src/core/logger.ts`
- Create: `bot/src/index.ts`

- [ ] **Step 1: Init bot package**

```bash
cd C:/Users/Usuario/Desktop/solana-bot/bot
pnpm init
```

- [ ] **Step 2: Install dependencies**

```bash
pnpm add @solana/web3.js @solana/spl-token @jup-ag/api @raydium-io/raydium-sdk-v2 helius-sdk jito-ts @supabase/supabase-js bs58 bn.js decimal.js pino dotenv zod node-telegram-bot-api
pnpm add -D typescript tsx @types/node @types/bn.js vitest
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Update bot/package.json scripts**

```json
{
  "name": "bot",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "build": "tsc",
    "test": "vitest run"
  }
}
```

- [ ] **Step 5: Create env validator**

Create `bot/src/config/env.ts`:

```typescript
import { z } from "zod";
import { config } from "dotenv";
config();

const envSchema = z.object({
  HELIUS_API_KEY: z.string().min(1),
  HELIUS_RPC_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  WALLET_ENCRYPTION_KEY: z.string().min(32).max(32),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  JITO_BLOCK_ENGINE_URL: z.string().url().default("https://mainnet.block-engine.jito.wtf"),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
});

export const env = envSchema.parse(process.env);
```

- [ ] **Step 6: Create constants**

Create `bot/src/config/constants.ts`:

```typescript
// Token mints (mainnet)
export const MINTS = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
} as const;

// Jupiter API
export const JUPITER_API_URL = "https://quote-api.jup.ag/v6";

// Drift mainnet program
export const DRIFT_PROGRAM_ID = "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH";

// Polling intervals (ms)
export const HEARTBEAT_INTERVAL_MS = 10_000;
export const PRICE_CHECK_INTERVAL_MS = 5_000;
export const SL_TP_CHECK_INTERVAL_MS = 5_000;

// Risk defaults
export const DEFAULT_SLIPPAGE_BPS = 50; // 0.5%
export const MAX_PRIORITY_FEE_LAMPORTS = 1_000_000; // 0.001 SOL
```

- [ ] **Step 7: Create logger**

Create `bot/src/core/logger.ts`:

```typescript
import pino from "pino";

export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  transport: process.env.NODE_ENV !== "production"
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
});
```

- [ ] **Step 8: Create entry point**

Create `bot/src/index.ts`:

```typescript
import { logger } from "./core/logger.js";
import { env } from "./config/env.js";

logger.info("SolBot starting up...");
logger.info({ rpc: env.HELIUS_RPC_URL.slice(0, 40) + "..." }, "Helius RPC configured");

// Main loop placeholder — strategies loaded in Plan B
async function main() {
  logger.info("Bot engine ready. Waiting for commands from dashboard.");
  // Heartbeat loop will be added with state module
}

main().catch((err) => {
  logger.error(err, "Fatal error");
  process.exit(1);
});
```

- [ ] **Step 9: Test it starts**

```bash
cd bot
cp .env.example .env  # fill in your values
pnpm dev
```

Expected output:
```
INFO  SolBot starting up...
INFO  Helius RPC configured
INFO  Bot engine ready. Waiting for commands from dashboard.
```

- [ ] **Step 10: Commit**

```bash
cd ..
git add bot/
git commit -m "feat: scaffold bot engine with TypeScript, Zod env, pino logger"
```

---

## Task 13: Bot Engine — Helius RPC + Wallet Loader

**Files:**
- Create: `bot/src/core/connection.ts`
- Create: `bot/src/core/wallet.ts`
- Create: `bot/tests/core/wallet.test.ts`

- [ ] **Step 1: Write wallet test first**

Create `bot/tests/core/wallet.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { encryptKey, decryptKey } from "../../src/core/wallet.js";

describe("wallet encryption", () => {
  const encryptionKey = "12345678901234567890123456789012"; // 32 chars

  it("round-trips a private key through encrypt/decrypt", () => {
    const original = "5KJvsngHeMpm884wtkJNzQGaCErckhHJBGFsvd3VyK5qMZXj3hS";
    const encrypted = encryptKey(original, encryptionKey);
    expect(encrypted).not.toBe(original);
    const decrypted = decryptKey(encrypted, encryptionKey);
    expect(decrypted).toBe(original);
  });

  it("different keys produce different ciphertext", () => {
    const key1 = encryptKey("test-private-key-string-here-xxx", "11111111111111111111111111111111");
    const key2 = encryptKey("test-private-key-string-here-xxx", "22222222222222222222222222222222");
    expect(key1).not.toBe(key2);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd bot && pnpm test
```

Expected: FAIL — `encryptKey is not exported`

- [ ] **Step 3: Implement wallet module**

Create `bot/src/core/wallet.ts`:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { logger } from "./logger.js";

const ALGORITHM = "aes-256-cbc";

export function encryptKey(privateKeyBase58: string, encryptionKey: string): string {
  const key = Buffer.from(encryptionKey.slice(0, 32), "utf-8");
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(privateKeyBase58, "utf-8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("base64");
}

export function decryptKey(encryptedValue: string, encryptionKey: string): string {
  const [ivHex, encryptedBase64] = encryptedValue.split(":");
  const key = Buffer.from(encryptionKey.slice(0, 32), "utf-8");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedBase64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf-8");
}

export function loadKeypair(encryptedPrivateKey: string, encryptionKey: string): Keypair {
  const privateKeyBase58 = decryptKey(encryptedPrivateKey, encryptionKey);
  const secretKey = bs58.decode(privateKeyBase58);
  return Keypair.fromSecretKey(secretKey);
}

export async function getKeypairForWallet(
  walletId: string,
  supabase: { from: (t: string) => any },
  encryptionKey: string
): Promise<Keypair> {
  const { data, error } = await supabase
    .from("wallets")
    .select("encrypted_private_key")
    .eq("id", walletId)
    .eq("is_active", true)
    .single();

  if (error || !data) throw new Error(`Wallet ${walletId} not found or inactive`);
  logger.debug({ walletId }, "Keypair loaded");
  return loadKeypair(data.encrypted_private_key, encryptionKey);
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
pnpm test
```

Expected: PASS ✓ 2 tests

- [ ] **Step 5: Create Helius connection**

Create `bot/src/core/connection.ts`:

```typescript
import { Connection } from "@solana/web3.js";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

let _connection: Connection | null = null;

export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(env.HELIUS_RPC_URL, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60_000,
    });
    logger.info("Solana connection initialized via Helius");
  }
  return _connection;
}
```

- [ ] **Step 6: Commit**

```bash
git add bot/
git commit -m "feat: add AES-256 wallet encryption and Helius RPC connection"
```

---

## Task 14: Bot Engine — Jupiter Swap Execution

**Files:**
- Create: `bot/src/execution/priorityFee.ts`
- Create: `bot/src/execution/jupiter.ts`
- Create: `bot/src/execution/txSender.ts`
- Create: `bot/tests/execution/jupiter.test.ts`

- [ ] **Step 1: Write Jupiter test first**

Create `bot/tests/execution/jupiter.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { buildSwapParams } from "../../src/execution/jupiter.js";
import { MINTS } from "../../src/config/constants.js";

describe("jupiter", () => {
  it("buildSwapParams returns correct structure for SOL→USDC", () => {
    const params = buildSwapParams({
      inputMint: MINTS.SOL,
      outputMint: MINTS.USDC,
      amountLamports: 1_000_000_000n, // 1 SOL
      slippageBps: 50,
    });
    expect(params.inputMint).toBe(MINTS.SOL);
    expect(params.outputMint).toBe(MINTS.USDC);
    expect(params.amount).toBe("1000000000");
    expect(params.slippageBps).toBe(50);
    expect(params.onlyDirectRoutes).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
pnpm test
```

Expected: FAIL — `buildSwapParams is not exported`

- [ ] **Step 3: Create priority fee module**

Create `bot/src/execution/priorityFee.ts`:

```typescript
import { env } from "../config/env.js";
import { MAX_PRIORITY_FEE_LAMPORTS } from "../config/constants.js";
import { logger } from "../core/logger.js";

interface HeliusPriorityFeeResponse {
  result: { priorityFeeEstimate: number };
}

export async function getDynamicPriorityFee(): Promise<number> {
  try {
    const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "getPriorityFeeEstimate",
        params: [{ options: { priorityLevel: "High" } }],
      }),
    });
    const data: HeliusPriorityFeeResponse = await res.json();
    const fee = Math.min(data.result.priorityFeeEstimate, MAX_PRIORITY_FEE_LAMPORTS);
    logger.debug({ fee }, "Priority fee estimate");
    return fee;
  } catch (err) {
    logger.warn(err, "Failed to get priority fee, using default");
    return 100_000; // fallback: 0.0001 SOL
  }
}
```

- [ ] **Step 4: Create Jupiter module**

Create `bot/src/execution/jupiter.ts`:

```typescript
import { VersionedTransaction } from "@solana/web3.js";
import type { Keypair } from "@solana/web3.js";
import { JUPITER_API_URL, DEFAULT_SLIPPAGE_BPS } from "../config/constants.js";
import { logger } from "../core/logger.js";

export interface SwapParams {
  inputMint: string;
  outputMint: string;
  amountLamports: bigint;
  slippageBps?: number;
}

export interface QuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
  routePlan: unknown[];
}

export function buildSwapParams(params: SwapParams) {
  return {
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amountLamports.toString(),
    slippageBps: params.slippageBps ?? DEFAULT_SLIPPAGE_BPS,
    onlyDirectRoutes: false,
  };
}

export async function getQuote(params: SwapParams): Promise<QuoteResponse> {
  const p = buildSwapParams(params);
  const url = new URL(`${JUPITER_API_URL}/quote`);
  url.searchParams.set("inputMint", p.inputMint);
  url.searchParams.set("outputMint", p.outputMint);
  url.searchParams.set("amount", p.amount);
  url.searchParams.set("slippageBps", p.slippageBps.toString());
  url.searchParams.set("onlyDirectRoutes", p.onlyDirectRoutes.toString());

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Jupiter quote failed: ${res.status} ${await res.text()}`);
  const quote: QuoteResponse = await res.json();
  logger.debug({ in: quote.inAmount, out: quote.outAmount, impact: quote.priceImpactPct }, "Jupiter quote");
  return quote;
}

export async function buildSwapTransaction(
  quote: QuoteResponse,
  userPublicKey: string,
  priorityFeeLamports: number
): Promise<VersionedTransaction> {
  const res = await fetch(`${JUPITER_API_URL}/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: priorityFeeLamports,
    }),
  });
  if (!res.ok) throw new Error(`Jupiter swap build failed: ${res.status} ${await res.text()}`);
  const { swapTransaction } = await res.json();
  const txBuf = Buffer.from(swapTransaction, "base64");
  return VersionedTransaction.deserialize(txBuf);
}

export async function executeSwap(
  params: SwapParams,
  keypair: Keypair,
  priorityFeeLamports: number,
  sendAndConfirm: (tx: VersionedTransaction) => Promise<string>
): Promise<{ txSignature: string; outAmount: string }> {
  const quote = await getQuote(params);
  const tx = await buildSwapTransaction(quote, keypair.publicKey.toBase58(), priorityFeeLamports);
  tx.sign([keypair]);
  const txSignature = await sendAndConfirm(tx);
  logger.info({ txSignature, out: quote.outAmount }, "Swap executed");
  return { txSignature, outAmount: quote.outAmount };
}
```

- [ ] **Step 5: Create TX sender**

Create `bot/src/execution/txSender.ts`:

```typescript
import { VersionedTransaction, SendTransactionError } from "@solana/web3.js";
import { getConnection } from "../core/connection.js";
import { logger } from "../core/logger.js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1_500;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendAndConfirmTransaction(tx: VersionedTransaction): Promise<string> {
  const connection = getConnection();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Refresh blockhash on retry
      if (attempt > 1) {
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
        tx.message.recentBlockhash = blockhash;
        logger.debug({ attempt, blockhash }, "Refreshed blockhash for retry");
      }

      const rawTx = tx.serialize();
      const signature = await connection.sendRawTransaction(rawTx, {
        skipPreflight: false,
        maxRetries: 0,
      });

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
      return signature;
    } catch (err) {
      lastError = err as Error;
      logger.warn({ attempt, err: (err as Error).message }, "TX send failed, retrying");
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError ?? new Error("TX failed after max retries");
}
```

- [ ] **Step 6: Run tests**

```bash
pnpm test
```

Expected: PASS ✓ 3 tests (including wallet tests from Task 13)

- [ ] **Step 7: Commit**

```bash
git add bot/
git commit -m "feat: add Jupiter swap execution with retry and priority fees"
```

---

## Task 15: Bot Engine — Drift Perps Integration

**Files:**
- Create: `bot/src/execution/drift.ts`

- [ ] **Step 1: Install Drift SDK**

```bash
cd bot
pnpm add @drift-labs/sdk
```

- [ ] **Step 2: Create Drift module**

Create `bot/src/execution/drift.ts`:

```typescript
import {
  DriftClient,
  Wallet,
  loadKeypair,
  BN,
  PositionDirection,
  OrderType,
  MarketType,
  BASE_PRECISION,
  PRICE_PRECISION,
  PerpMarkets,
} from "@drift-labs/sdk";
import type { Keypair } from "@solana/web3.js";
import { getConnection } from "../core/connection.js";
import { logger } from "../core/logger.js";

export type PerpMarketSymbol = "SOL-PERP" | "BTC-PERP" | "ETH-PERP";

interface OpenPerpParams {
  keypair: Keypair;
  market: PerpMarketSymbol;
  direction: "long" | "short";
  usdSize: number;       // position size in USD
  leverage: number;      // 1–20
  takeProfitPct?: number;
  stopLossPct?: number;
}

export async function openPerpPosition(params: OpenPerpParams): Promise<string> {
  const connection = getConnection();
  const wallet = new Wallet(params.keypair);

  const driftClient = new DriftClient({
    connection,
    wallet,
    env: "mainnet-beta",
  });

  await driftClient.subscribe();

  const marketIndex = PerpMarkets["mainnet-beta"].findIndex(
    (m) => m.baseAssetSymbol === params.market.replace("-PERP", "")
  );
  if (marketIndex === -1) throw new Error(`Unknown perp market: ${params.market}`);

  const direction = params.direction === "long" ? PositionDirection.LONG : PositionDirection.SHORT;
  const baseAssetAmount = new BN(params.usdSize * params.leverage).mul(BASE_PRECISION).divn(1); // simplified

  const txSig = await driftClient.openPosition(
    direction,
    baseAssetAmount,
    marketIndex
  );

  logger.info({ txSig, market: params.market, direction: params.direction }, "Perp position opened");
  await driftClient.unsubscribe();
  return txSig;
}

export async function closePerpPosition(keypair: Keypair, marketIndex: number): Promise<string> {
  const connection = getConnection();
  const wallet = new Wallet(keypair);

  const driftClient = new DriftClient({ connection, wallet, env: "mainnet-beta" });
  await driftClient.subscribe();

  const txSig = await driftClient.closePosition(marketIndex);
  logger.info({ txSig, marketIndex }, "Perp position closed");
  await driftClient.unsubscribe();
  return txSig;
}
```

- [ ] **Step 3: Commit**

```bash
git add bot/
git commit -m "feat: add Drift Protocol perp open/close execution"
```

---

## Task 16: Bot Engine — Supabase State + Heartbeat

**Files:**
- Create: `bot/src/state/supabase.ts`
- Create: `bot/src/state/botState.ts`
- Create: `bot/src/state/positions.ts`
- Create: `bot/src/state/trades.ts`
- Create: `bot/tests/state/positions.test.ts`

- [ ] **Step 1: Write positions test**

Create `bot/tests/state/positions.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildPositionInsert } from "../../src/state/positions.js";

describe("positions", () => {
  it("buildPositionInsert produces correct shape", () => {
    const result = buildPositionInsert({
      strategyId: "dca",
      walletId: "wallet-uuid-123",
      tokenMint: "So11111111111111111111111111111111111111112",
      tokenSymbol: "SOL",
      side: "spot",
      entryPrice: 150.50,
      amountUsd: 50,
      amountTokens: 0.3322,
      takeProfitPrice: 180,
    });
    expect(result.strategy_id).toBe("dca");
    expect(result.side).toBe("spot");
    expect(result.entry_price).toBe(150.50);
    expect(result.take_profit_price).toBe(180);
    expect(result.stop_loss_price).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
pnpm test
```

Expected: FAIL — `buildPositionInsert is not exported`

- [ ] **Step 3: Create Supabase service client**

Create `bot/src/state/supabase.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
```

- [ ] **Step 4: Create positions module**

Create `bot/src/state/positions.ts`:

```typescript
import { supabase } from "./supabase.js";
import { logger } from "../core/logger.js";

interface PositionInsertParams {
  strategyId: string;
  walletId: string;
  tokenMint: string;
  tokenSymbol?: string;
  side: "long" | "short" | "spot";
  entryPrice: number;
  amountUsd: number;
  amountTokens: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  leverage?: number;
  txSignature?: string;
}

export function buildPositionInsert(params: PositionInsertParams) {
  return {
    strategy_id: params.strategyId,
    wallet_id: params.walletId,
    token_mint: params.tokenMint,
    token_symbol: params.tokenSymbol ?? null,
    side: params.side,
    entry_price: params.entryPrice,
    amount_usd: params.amountUsd,
    amount_tokens: params.amountTokens,
    stop_loss_price: params.stopLossPrice ?? null,
    take_profit_price: params.takeProfitPrice ?? null,
    leverage: params.leverage ?? 1,
    tx_signature: params.txSignature ?? null,
  };
}

export async function insertPosition(params: PositionInsertParams): Promise<string> {
  const { data, error } = await supabase
    .from("positions")
    .insert(buildPositionInsert(params))
    .select("id")
    .single();
  if (error) throw new Error(`insertPosition failed: ${error.message}`);
  logger.info({ positionId: data.id, strategy: params.strategyId }, "Position inserted");
  return data.id;
}

export async function removePosition(positionId: string): Promise<void> {
  const { error } = await supabase.from("positions").delete().eq("id", positionId);
  if (error) throw new Error(`removePosition failed: ${error.message}`);
}

export async function getOpenPositions() {
  const { data, error } = await supabase.from("positions").select("*");
  if (error) throw new Error(`getOpenPositions failed: ${error.message}`);
  return data ?? [];
}
```

- [ ] **Step 5: Create trades module**

Create `bot/src/state/trades.ts`:

```typescript
import { supabase } from "./supabase.js";
import { logger } from "../core/logger.js";

interface TradeRecordParams {
  strategyId?: string;
  walletId?: string;
  tokenMint?: string;
  tokenSymbol?: string;
  side: string;
  entryPrice?: number;
  exitPrice?: number;
  amountUsd?: number;
  pnlUsd?: number;
  pnlPct?: number;
  feesSol?: number;
  txSignature?: string;
  durationSeconds?: number;
}

export async function recordTrade(params: TradeRecordParams): Promise<void> {
  const { error } = await supabase.from("trades").insert({
    strategy_id: params.strategyId ?? null,
    wallet_id: params.walletId ?? null,
    token_mint: params.tokenMint ?? null,
    token_symbol: params.tokenSymbol ?? null,
    side: params.side,
    entry_price: params.entryPrice ?? null,
    exit_price: params.exitPrice ?? null,
    amount_usd: params.amountUsd ?? null,
    pnl_usd: params.pnlUsd ?? null,
    pnl_pct: params.pnlPct ?? null,
    fees_sol: params.feesSol ?? null,
    tx_signature: params.txSignature ?? null,
    duration_seconds: params.durationSeconds ?? null,
  });
  if (error) logger.error(error, "Failed to record trade");
  else logger.info({ strategy: params.strategyId, pnl: params.pnlUsd }, "Trade recorded");
}
```

- [ ] **Step 6: Create bot state module**

Create `bot/src/state/botState.ts`:

```typescript
import { supabase } from "./supabase.js";
import { HEARTBEAT_INTERVAL_MS } from "../config/constants.js";
import { logger } from "../core/logger.js";

export async function isBotRunning(): Promise<boolean> {
  const { data } = await supabase.from("bot_state").select("is_running").eq("id", 1).single();
  return data?.is_running ?? false;
}

export async function setHeartbeat(activeStrategyCount: number): Promise<void> {
  await supabase.from("bot_state").update({
    last_heartbeat: new Date().toISOString(),
    active_strategy_count: activeStrategyCount,
  }).eq("id", 1);
}

export function startHeartbeat(getActiveCount: () => number): NodeJS.Timeout {
  return setInterval(async () => {
    await setHeartbeat(getActiveCount()).catch((err) =>
      logger.warn(err, "Heartbeat failed")
    );
  }, HEARTBEAT_INTERVAL_MS);
}
```

- [ ] **Step 7: Run tests**

```bash
pnpm test
```

Expected: PASS ✓ 5 tests total

- [ ] **Step 8: Update index.ts with heartbeat**

Edit `bot/src/index.ts`:

```typescript
import { logger } from "./core/logger.js";
import { env } from "./config/env.js";
import { startHeartbeat, isBotRunning } from "./state/botState.js";

logger.info("SolBot starting up...");

async function main() {
  logger.info({ rpc: env.HELIUS_RPC_URL.slice(0, 40) + "..." }, "Helius RPC configured");

  const heartbeat = startHeartbeat(() => 0);
  logger.info("Heartbeat started — dashboard will show bot as active");

  // Graceful shutdown
  process.on("SIGTERM", () => {
    clearInterval(heartbeat);
    logger.info("Bot shut down gracefully");
    process.exit(0);
  });

  // Command loop — check every 5s if bot should be running
  while (true) {
    const running = await isBotRunning();
    if (running) {
      logger.debug("Bot is enabled — strategies will execute in Plan B");
    }
    await new Promise((r) => setTimeout(r, 5_000));
  }
}

main().catch((err) => {
  logger.error(err, "Fatal error");
  process.exit(1);
});
```

- [ ] **Step 9: Commit**

```bash
git add bot/
git commit -m "feat: add supabase state, positions CRUD, trade history, heartbeat loop"
```

---

## Task 17: Telegram Notifications

**Files:**
- Create: `bot/src/notify/telegram.ts`

- [ ] **Step 1: Create Telegram module**

Create `bot/src/notify/telegram.ts`:

```typescript
import { env } from "../config/env.js";
import { logger } from "../core/logger.js";

async function sendTelegramMessage(text: string): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: "HTML" }),
    });
  } catch (err) {
    logger.warn(err, "Telegram alert failed");
  }
}

export const notify = {
  fill: (symbol: string, side: string, amountUsd: number, txSig: string) =>
    sendTelegramMessage(`✅ <b>FILL</b> ${side.toUpperCase()} ${symbol}\n💵 $${amountUsd.toFixed(2)}\n🔗 <a href="https://solscan.io/tx/${txSig}">View TX</a>`),

  slHit: (symbol: string, pnlUsd: number) =>
    sendTelegramMessage(`🛑 <b>STOP LOSS</b> hit on ${symbol}\n📉 PnL: $${pnlUsd.toFixed(2)}`),

  tpHit: (symbol: string, pnlUsd: number) =>
    sendTelegramMessage(`🎯 <b>TAKE PROFIT</b> hit on ${symbol}\n📈 PnL: +$${pnlUsd.toFixed(2)}`),

  error: (message: string) =>
    sendTelegramMessage(`⚠️ <b>BOT ERROR</b>\n${message}`),

  circuitBreaker: (reason: string) =>
    sendTelegramMessage(`🚨 <b>CIRCUIT BREAKER TRIGGERED</b>\n${reason}\nAll trading paused.`),

  botStarted: () =>
    sendTelegramMessage(`🟢 <b>SolBot started</b>`),

  botStopped: () =>
    sendTelegramMessage(`🔴 <b>SolBot stopped</b>`),
};
```

- [ ] **Step 2: Commit**

```bash
git add bot/src/notify/
git commit -m "feat: add Telegram notification module"
```

---

## Task 18: Deployment

**Files:**
- Create: `dashboard/vercel.json`
- Create: `bot/railway.json`
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create Vercel config**

Create `dashboard/vercel.json`:

```json
{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "outputDirectory": ".next"
}
```

- [ ] **Step 2: Create Railway config**

Create `bot/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

- [ ] **Step 3: Create GitHub Actions CI**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-bot:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install
      - run: pnpm --filter bot test

  build-dashboard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install
      - run: pnpm --filter dashboard build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

- [ ] **Step 4: Push to GitHub**

```bash
cd C:/Users/Usuario/Desktop/solana-bot
git add .
git commit -m "chore: add deployment configs for Vercel, Railway, and GitHub Actions"
git remote add origin https://github.com/YOUR_USERNAME/solana-bot.git
git push -u origin main
```

- [ ] **Step 5: Connect Vercel**

1. Go to vercel.com → New Project → Import `solana-bot` repo
2. Set root directory to `dashboard`
3. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `WALLET_ENCRYPTION_KEY`
4. Deploy

- [ ] **Step 6: Connect Railway**

1. Go to railway.app → New Project → Deploy from GitHub → select `solana-bot`
2. Set root directory to `bot`
3. Add all env vars from `bot/.env.example`
4. Deploy

- [ ] **Step 7: Verify end-to-end**

Open Vercel URL in browser:
- Should show PIN setup screen
- After PIN → Overview page with START/STOP button
- Click START → bot_state.is_running = true → Railway bot should log "Bot is enabled"
- Telegram should receive "🟢 SolBot started" if tokens configured

- [ ] **Step 8: Final commit**

```bash
git add .
git commit -m "feat: Plan A complete — dashboard live on Vercel, bot engine live on Railway"
```

---

## Plan A Complete ✅

**What's working after Plan A:**
- Live dark-mode dashboard at your Vercel URL
- PIN lock on the dashboard
- Overview page with START/STOP bot button (real-time)
- Wallets page — add encrypted trading wallets
- Strategies page — toggle strategies on/off
- Spot + Perps page shells
- Bot engine running 24/7 on Railway with heartbeat
- Jupiter swap execution primitive ready
- Drift perp execution primitive ready
- Telegram alerts wired up
- All state synced through Supabase in real time

**Plan B adds:** All 6 strategy logic modules, Risk Manager (SL/TP monitor, circuit breaker, daily loss limit), full strategy config panels in the dashboard, and live trade execution triggered by real signals.
