-- ---------------------------------------------------------------------------
-- Concord ChemTrack - `users` table
--
-- The application authenticates against this custom table (not Supabase Auth).
-- Passwords are stored as bcrypt hashes; the API layer also transparently
-- upgrades legacy plaintext rows to a bcrypt hash on first successful login.
--
-- Apply via the Supabase SQL Editor, or:
--   supabase db push
--   supabase db execute --file supabase/migrations/0001_create_users.sql
-- ---------------------------------------------------------------------------

create table if not exists public.users (
  id         uuid primary key default gen_random_uuid(),
  username   text not null unique,
  password   text not null,
  created_at timestamptz not null default now()
);

-- Fast case-insensitive lookup used by the sign-in endpoint.
create index if not exists users_username_lower_idx
  on public.users (lower(username));

-- The table is only reachable through the server-side service-role client.
-- Enabling RLS with no policies denies all anon/authenticated access.
alter table public.users enable row level security;

comment on table public.users is
  'Concord ChemTrack application users. Password column holds a bcrypt hash.';
