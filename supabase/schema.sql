-- ProofReview — Supabase schema
-- Copy-paste this entire file into the Supabase SQL Editor and click "Run".
-- Safe to run multiple times.

-- 1. Extensions ---------------------------------------------------------------
create extension if not exists "pgcrypto";

-- 2. Tables -------------------------------------------------------------------

-- Verified humans, keyed by World ID nullifier_hash.
create table if not exists public.users (
  nullifier_hash text primary key,
  verified       boolean not null default true,
  created_at     timestamptz not null default now()
);

-- Businesses / products / services.
create table if not exists public.listings (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null,
  description text not null,
  created_at  timestamptz not null default now()
);

-- One review per (listing, user). Enforced by the unique constraint below.
create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id    text not null,
  rating     int  not null check (rating between 1 and 5),
  text       text not null,
  created_at timestamptz not null default now(),
  unique (listing_id, user_id)
);

-- One vote per (listing, user). The id is deterministic so duplicate votes
-- are physically impossible; toggling/changing votes upserts the same row.
create table if not exists public.votes (
  id         text primary key,
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id    text not null,
  type       text not null check (type in ('upvote','downvote')),
  created_at timestamptz not null default now(),
  unique (listing_id, user_id)
);

-- 3. Indexes ------------------------------------------------------------------
create index if not exists reviews_listing_idx on public.reviews(listing_id);
create index if not exists reviews_user_idx    on public.reviews(user_id);
create index if not exists votes_listing_idx   on public.votes(listing_id);
create index if not exists votes_user_idx      on public.votes(user_id);

-- 4. Row Level Security -------------------------------------------------------
-- For a hackathon: anyone can read; anyone (with the public anon key) can
-- write. We trust the World ID gate at the app layer. Tighten this later
-- using JWTs / signed nullifier proofs if you go to production.

alter table public.users    enable row level security;
alter table public.listings enable row level security;
alter table public.reviews  enable row level security;
alter table public.votes    enable row level security;

-- Drop any older copies of these policies so this script is idempotent.
drop policy if exists "pr_read_users"       on public.users;
drop policy if exists "pr_write_users"      on public.users;
drop policy if exists "pr_update_users"     on public.users;
drop policy if exists "pr_read_listings"    on public.listings;
drop policy if exists "pr_write_listings"   on public.listings;
drop policy if exists "pr_read_reviews"     on public.reviews;
drop policy if exists "pr_write_reviews"    on public.reviews;
drop policy if exists "pr_update_reviews"   on public.reviews;
drop policy if exists "pr_read_votes"       on public.votes;
drop policy if exists "pr_write_votes"      on public.votes;
drop policy if exists "pr_update_votes"     on public.votes;
drop policy if exists "pr_delete_votes"     on public.votes;

create policy "pr_read_users"     on public.users    for select using (true);
create policy "pr_write_users"    on public.users    for insert with check (true);
create policy "pr_update_users"   on public.users    for update using (true) with check (true);

create policy "pr_read_listings"  on public.listings for select using (true);
create policy "pr_write_listings" on public.listings for insert with check (true);

create policy "pr_read_reviews"   on public.reviews  for select using (true);
create policy "pr_write_reviews"  on public.reviews  for insert with check (true);
create policy "pr_update_reviews" on public.reviews  for update using (true) with check (true);

create policy "pr_read_votes"     on public.votes    for select using (true);
create policy "pr_write_votes"    on public.votes    for insert with check (true);
create policy "pr_update_votes"   on public.votes    for update using (true) with check (true);
create policy "pr_delete_votes"   on public.votes    for delete using (true);

-- 5. Realtime -----------------------------------------------------------------
-- Add tables to the supabase_realtime publication so the app can subscribe to
-- live changes. Wrapped in a DO block so re-running is safe.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.listings; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.reviews;  exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.votes;    exception when duplicate_object then null; end;
  end if;
end $$;

-- Done.
