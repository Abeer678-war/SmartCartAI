-- Run in Supabase > SQL Editor
create table if not exists public.searches (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  query text not null,
  result jsonb,
  created_at timestamptz not null default now()
);
create index if not exists searches_user_time on public.searches (user_id, created_at desc);

-- RLS on with NO policies = browser can never read/write this table.
-- Only our server (service role key) can, after Clerk verifies the user.
alter table public.searches enable row level security;

-- Subscription plans: one row per user. No row = Basic (free).
-- plan_until = when Super ends (null = no end date).
create table if not exists public.profiles (
  user_id text primary key,
  plan text not null default 'basic' check (plan in ('basic','super')),
  plan_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists plan_until timestamptz;
alter table public.profiles enable row level security;

-- PayPal payments: each order can switch Super on only once, and only for the user who started it.
create table if not exists public.paypal_orders (
  order_id text primary key,
  user_id text not null,
  granted_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.paypal_orders enable row level security;
