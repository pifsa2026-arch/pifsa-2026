-- PIFSA Portal — Supabase schema (v2)
-- Run this in Supabase → SQL Editor. Safe to re-run.

-- ============ LEADS (Enrollment CRM) ============
create table if not exists public.leads (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  contact_number text,
  programs text[] default '{}',
  training_duration text,
  stage text not null default 'Leads'
    check (stage in ('Leads','Applicants','Examinees','For Requirements','Admitted','Paid')),
  source text default 'landing_page',
  amount_paid numeric not null default 0,
  notes text
);

alter table public.leads enable row level security;

drop policy if exists "anon can submit leads" on public.leads;
create policy "anon can submit leads"
  on public.leads for insert to anon with check (true);

drop policy if exists "authed can insert leads" on public.leads;
create policy "authed can insert leads"
  on public.leads for insert to authenticated with check (true);

drop policy if exists "authed can read leads" on public.leads;
create policy "authed can read leads"
  on public.leads for select to authenticated using (true);

drop policy if exists "authed can update leads" on public.leads;
create policy "authed can update leads"
  on public.leads for update to authenticated using (true);

drop policy if exists "authed can delete leads" on public.leads;
create policy "authed can delete leads"
  on public.leads for delete to authenticated using (true);

-- If upgrading an older leads table, add new columns / widen stage check:
alter table public.leads add column if not exists programs text[] default '{}';
alter table public.leads add column if not exists training_duration text;
alter table public.leads add column if not exists amount_paid numeric not null default 0;

-- ============ EXPENSES (Revenue Dashboard) ============
create table if not exists public.expenses (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  spent_on date not null default now(),
  category text not null check (category in ('Marketing','Operations')),
  subcategory text not null,
  description text,
  amount numeric not null default 0
);

alter table public.expenses enable row level security;

drop policy if exists "authed manage expenses" on public.expenses;
create policy "authed manage expenses"
  on public.expenses for all to authenticated using (true) with check (true);

-- ============ v3: per-duration expense tagging ============
-- Tag each expense with a training duration, or 'General' for annual/shared costs.
alter table public.expenses add column if not exists duration text default 'General';

-- ============ v4: automations (workflow builder) ============
create table if not exists public.automations (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  enabled boolean not null default true,
  -- trigger: e.g. { type: 'stage_changed', stage: 'Admitted' } or { type: 'lead_created' }
  trigger jsonb not null default '{}',
  -- ordered list of steps: [{ type:'send_email', ... }, { type:'delay', hours:24 }, ...]
  steps jsonb not null default '[]',
  -- stats
  run_count integer not null default 0,
  last_run_at timestamptz
);
alter table public.automations enable row level security;
drop policy if exists "authed manage automations" on public.automations;
create policy "authed manage automations"
  on public.automations for all to authenticated using (true) with check (true);

-- ============ v5: expanded expense categories + lead detail fields ============
-- New primary expense sources (Digital, Events, Print, Operations)
alter table public.expenses drop constraint if exists expenses_category_check;
alter table public.expenses add constraint expenses_category_check
  check (category in ('Digital','Events','Print','Operations'));

-- Additional lead detail fields (all optional)
alter table public.leads add column if not exists current_work text;
alter table public.leads add column if not exists location text;
alter table public.leads add column if not exists bs_degree text;

-- ============ v6: payments + notes history tables ============
create table if not exists public.payments (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  lead_id bigint not null references public.leads(id) on delete cascade,
  amount numeric not null default 0,
  paid_on timestamptz not null default now(),
  note text
);
alter table public.payments enable row level security;
drop policy if exists "authed manage payments" on public.payments;
create policy "authed manage payments"
  on public.payments for all to authenticated using (true) with check (true);

create table if not exists public.lead_notes (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  lead_id bigint not null references public.leads(id) on delete cascade,
  body text not null
);
alter table public.lead_notes enable row level security;
drop policy if exists "authed manage notes" on public.lead_notes;
create policy "authed manage notes"
  on public.lead_notes for all to authenticated using (true) with check (true);

-- lead source column (for manual adds: meta, google, walk_in, flyers, referral, landing_page)
alter table public.leads add column if not exists source text default 'landing_page';

-- ============ v7: Admin Console — events + admins ============

-- Calendar events (durations + featured events), editable from Admin Console
create table if not exists public.events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null default 'duration' check (kind in ('duration','featured')),
  title text not null,
  date_range text,                 -- e.g. "January 30 – March 20, 2027"
  featured boolean not null default false,
  -- extra details (for featured events): program, modality, fee, deposit, venue, who, deadline, description
  details jsonb not null default '{}',
  sort_order int not null default 0
);
alter table public.events enable row level security;
-- Public (anon) can READ events for the landing page; only authed can manage.
drop policy if exists "anyone can read events" on public.events;
create policy "anyone can read events" on public.events for select to anon, authenticated using (true);
drop policy if exists "authed manage events" on public.events;
create policy "authed manage events" on public.events for all to authenticated using (true) with check (true);

-- Admins allowlist — add an email here to grant Admin Console access
create table if not exists public.admins (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  email text not null unique
);
alter table public.admins enable row level security;
-- Any logged-in user can check whether their own email is an admin.
drop policy if exists "authed can read admins" on public.admins;
create policy "authed can read admins" on public.admins for select to authenticated using (true);
