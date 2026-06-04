-- Run this in the Supabase SQL editor if you want shareable bouquet links.
create extension if not exists "pgcrypto";

create table if not exists public.bouquets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists bouquets_created_at_idx on public.bouquets (created_at desc);

alter table public.bouquets enable row level security;

create policy "bouquets_select_public"
  on public.bouquets for select
  using (true);

create policy "bouquets_insert_public"
  on public.bouquets for insert
  with check (true);
