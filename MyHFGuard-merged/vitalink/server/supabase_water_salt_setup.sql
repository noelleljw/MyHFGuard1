create extension if not exists pgcrypto;

create table if not exists public.water_salt_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  water_intake integer not null check (water_intake >= 0),
  salt_intake integer not null check (salt_intake >= 0),
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_water_salt_logs_patient_date
  on public.water_salt_logs (patient_id, date desc);

alter table public.water_salt_logs enable row level security;

drop policy if exists "water_salt_select_own" on public.water_salt_logs;
create policy "water_salt_select_own"
  on public.water_salt_logs
  for select
  to authenticated
  using (auth.uid() = patient_id);

drop policy if exists "water_salt_insert_own" on public.water_salt_logs;
create policy "water_salt_insert_own"
  on public.water_salt_logs
  for insert
  to authenticated
  with check (auth.uid() = patient_id);
