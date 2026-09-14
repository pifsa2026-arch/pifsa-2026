-- ═══════════════════════════════════════════════════════════════════════════
-- PIFSA — Row Level Security
-- Run this entire file in Supabase → SQL Editor.
-- It locks every table so only authenticated (logged-in) users can access data.
-- The Apps Script uses the SERVICE ROLE key (set in your script), so it bypasses
-- RLS for automation_jobs — that's intentional and correct.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. LEADS ────────────────────────────────────────────────────────────────
alter table leads enable row level security;

drop policy if exists "auth users can read leads"   on leads;
drop policy if exists "auth users can insert leads" on leads;
drop policy if exists "auth users can update leads" on leads;
drop policy if exists "auth users can delete leads" on leads;

create policy "auth users can read leads"
  on leads for select
  to authenticated
  using (true);

create policy "auth users can insert leads"
  on leads for insert
  to authenticated
  with check (true);

create policy "auth users can update leads"
  on leads for update
  to authenticated
  using (true);

create policy "auth users can delete leads"
  on leads for delete
  to authenticated
  using (true);

-- ─── 2. PAYMENTS ─────────────────────────────────────────────────────────────
alter table payments enable row level security;

drop policy if exists "auth users can read payments"   on payments;
drop policy if exists "auth users can insert payments" on payments;
drop policy if exists "auth users can update payments" on payments;
drop policy if exists "auth users can delete payments" on payments;

create policy "auth users can read payments"
  on payments for select
  to authenticated
  using (true);

create policy "auth users can insert payments"
  on payments for insert
  to authenticated
  with check (true);

create policy "auth users can update payments"
  on payments for update
  to authenticated
  using (true);

create policy "auth users can delete payments"
  on payments for delete
  to authenticated
  using (true);

-- ─── 3. LEAD NOTES ───────────────────────────────────────────────────────────
alter table lead_notes enable row level security;

drop policy if exists "auth users can read lead_notes"   on lead_notes;
drop policy if exists "auth users can insert lead_notes" on lead_notes;
drop policy if exists "auth users can update lead_notes" on lead_notes;
drop policy if exists "auth users can delete lead_notes" on lead_notes;

create policy "auth users can read lead_notes"
  on lead_notes for select
  to authenticated
  using (true);

create policy "auth users can insert lead_notes"
  on lead_notes for insert
  to authenticated
  with check (true);

create policy "auth users can update lead_notes"
  on lead_notes for update
  to authenticated
  using (true);

create policy "auth users can delete lead_notes"
  on lead_notes for delete
  to authenticated
  using (true);

-- ─── 4. AUTOMATIONS ──────────────────────────────────────────────────────────
alter table automations enable row level security;

drop policy if exists "auth users can read automations"   on automations;
drop policy if exists "auth users can insert automations" on automations;
drop policy if exists "auth users can update automations" on automations;
drop policy if exists "auth users can delete automations" on automations;

create policy "auth users can read automations"
  on automations for select
  to authenticated
  using (true);

create policy "auth users can insert automations"
  on automations for insert
  to authenticated
  with check (true);

create policy "auth users can update automations"
  on automations for update
  to authenticated
  using (true);

create policy "auth users can delete automations"
  on automations for delete
  to authenticated
  using (true);

-- ─── 5. AUTOMATION JOBS ──────────────────────────────────────────────────────
-- The browser app inserts jobs (authenticated user).
-- Google Apps Script reads + updates jobs using the SERVICE ROLE key,
-- which bypasses RLS entirely — no anon policy needed here.
alter table automation_jobs enable row level security;

drop policy if exists "anon can insert and read"          on automation_jobs;
drop policy if exists "auth users can insert jobs"        on automation_jobs;
drop policy if exists "auth users can read jobs"          on automation_jobs;

create policy "auth users can insert jobs"
  on automation_jobs for insert
  to authenticated
  with check (true);

create policy "auth users can read jobs"
  on automation_jobs for select
  to authenticated
  using (true);

-- NOTE: UPDATE on automation_jobs (marking sent/failed) is done by Apps Script
-- via the service role key — it bypasses RLS, so no update policy is needed
-- for that table from the browser side.

-- ─── 6. ADMINS ───────────────────────────────────────────────────────────────
-- The admins table is read by useIsAdmin() on the client.
-- Only authenticated users should be able to read it; nobody should write it
-- from the client (manage it directly in the Supabase dashboard).
alter table admins enable row level security;

drop policy if exists "auth users can read admins" on admins;

create policy "auth users can read admins"
  on admins for select
  to authenticated
  using (true);

-- ─── 7. SEED YOUR OWN ADMIN ACCOUNT ─────────────────────────────────────────
-- Run this separately after the policies above to make yourself an admin.
-- Replace the email with your actual login email.
--
-- insert into admins (email) values ('pifsa2026@gmail.com')
-- on conflict (email) do nothing;

-- ─── 8. VERIFY ───────────────────────────────────────────────────────────────
-- After running, check that RLS is on for each table:
-- select tablename, rowsecurity from pg_tables
-- where schemaname = 'public'
-- order by tablename;
