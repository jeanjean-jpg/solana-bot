-- Wallets
create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  encrypted_private_key text not null,
  cold_wallet_address text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Bot state (single row, always id=1)
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
