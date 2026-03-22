-- NextAuth.js v5 adapter schema for Supabase
-- Run this once in the Supabase SQL editor before enabling auth.
-- https://authjs.dev/getting-started/adapters/supabase

create table if not exists users (
  id text not null primary key,
  name text,
  email text unique,
  "emailVerified" timestamptz,
  image text
);

create table if not exists accounts (
  id text not null primary key,
  "userId" text not null references users(id) on delete cascade,
  type text not null,
  provider text not null,
  "providerAccountId" text not null,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text
);

create table if not exists sessions (
  id text not null primary key,
  "sessionToken" text not null unique,
  "userId" text not null references users(id) on delete cascade,
  expires timestamptz not null
);

create table if not exists verification_tokens (
  identifier text not null,
  token text not null,
  expires timestamptz not null,
  primary key (identifier, token)
);
