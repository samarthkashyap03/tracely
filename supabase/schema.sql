-- =====================================================================
-- Job Tracker — Supabase schema
-- Run this in the Supabase SQL Editor for a fresh project.
-- =====================================================================

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- job_applications ----------
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  role text,
  status text not null default 'Applied',
  platform text,
  work_type text,
  location text,
  salary text,
  url text,
  notes text,
  applied_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_applications_user_idx on public.job_applications(user_id, applied_at desc);

alter table public.job_applications enable row level security;

create policy "jobs: select own" on public.job_applications
  for select using (auth.uid() = user_id);
create policy "jobs: insert own" on public.job_applications
  for insert with check (auth.uid() = user_id);
create policy "jobs: update own" on public.job_applications
  for update using (auth.uid() = user_id);
create policy "jobs: delete own" on public.job_applications
  for delete using (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists job_applications_touch on public.job_applications;
create trigger job_applications_touch
  before update on public.job_applications
  for each row execute function public.touch_updated_at();

-- ---------- user_options (custom dropdown values) ----------
create table if not exists public.user_options (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('status','platform','work_type','role')),
  value text not null,
  created_at timestamptz not null default now(),
  unique (user_id, category, value)
);

create index if not exists user_options_user_idx on public.user_options(user_id, category);

alter table public.user_options enable row level security;

create policy "options: select own" on public.user_options
  for select using (auth.uid() = user_id);
create policy "options: insert own" on public.user_options
  for insert with check (auth.uid() = user_id);
create policy "options: update own" on public.user_options
  for update using (auth.uid() = user_id);
create policy "options: delete own" on public.user_options
  for delete using (auth.uid() = user_id);

-- Seed defaults for new users
create or replace function public.seed_user_options()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_options (user_id, category, value) values
    (new.id, 'status', 'Applied'),
    (new.id, 'status', 'Under Process'),
    (new.id, 'status', 'Interview'),
    (new.id, 'status', 'Offer'),
    (new.id, 'status', 'Rejected'),
    (new.id, 'platform', 'LinkedIn'),
    (new.id, 'platform', 'Indeed'),
    (new.id, 'platform', 'Stepstone'),
    (new.id, 'platform', 'Wellfound'),
    (new.id, 'platform', 'Company Website'),
    (new.id, 'work_type', 'Remote'),
    (new.id, 'work_type', 'Hybrid'),
    (new.id, 'work_type', 'Onsite'),
    (new.id, 'role', 'Software Engineer'),
    (new.id, 'role', 'Gen AI Engineer'),
    (new.id, 'role', 'Data Scientist'),
    (new.id, 'role', 'Product Manager'),
    (new.id, 'role', 'Designer')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_seed_options on auth.users;
create trigger on_auth_user_seed_options
  after insert on auth.users
  for each row execute function public.seed_user_options();
