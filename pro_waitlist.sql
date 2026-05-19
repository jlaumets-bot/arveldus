-- Run this in Supabase Studio → SQL Editor
-- Creates the table the Pro upgrade modal writes into.

create table if not exists public.pro_waitlist (
  id bigserial primary key,
  email text not null,
  user_id uuid references auth.users(id) on delete set null,
  plan_interest text default 'unknown',  -- 'monthly' | 'lifetime' | 'unknown'
  source text default 'app',             -- 'app' | 'landing'
  created_at timestamptz default now(),
  unique(email)
);

-- Index on created_at for easy "show me the latest signups" queries
create index if not exists pro_waitlist_created_idx on public.pro_waitlist (created_at desc);

-- RLS: anyone (signed in or not) can INSERT. Nobody can read except via service role.
alter table public.pro_waitlist enable row level security;

-- Allow public insert (so anonymous users on the landing can sign up too, later)
drop policy if exists "anyone can join waitlist" on public.pro_waitlist;
create policy "anyone can join waitlist" on public.pro_waitlist
  for insert to anon, authenticated
  with check (true);

-- Nobody can read via anon/authenticated. Use service role key from your admin tooling.
-- (No SELECT policy = no SELECT access)

-- To view the list later, run this from Supabase Studio (it uses service role):
--   select email, created_at, user_id from pro_waitlist order by created_at desc;
