-- InstaInsights user data tables for Phase 2B
-- Run this in the Supabase SQL editor after schema-auth.sql.
-- user_id matches the id from the NextAuth `users` table.
-- Security is enforced at the API layer (auth() check + user_id filter).

create table if not exists user_collabs (
  id text primary key,
  user_id text not null,
  data jsonb not null,
  updated_at timestamptz default now()
);
create index if not exists user_collabs_uid on user_collabs (user_id);

create table if not exists user_invoices (
  id text primary key,
  user_id text not null,
  data jsonb not null,
  updated_at timestamptz default now()
);
create index if not exists user_invoices_uid on user_invoices (user_id);

create table if not exists user_campaigns (
  id text primary key,
  user_id text not null,
  data jsonb not null,
  updated_at timestamptz default now()
);
create index if not exists user_campaigns_uid on user_campaigns (user_id);

create table if not exists user_profiles (
  user_id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);
