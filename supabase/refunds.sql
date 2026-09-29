-- Run in Supabase → SQL Editor. Safe to run more than once.

-- Payments can now be a payment or a refund
alter table payments add column if not exists kind text not null default 'payment';
alter table payments drop constraint if exists payments_kind_check;
alter table payments add constraint payments_kind_check check (kind in ('payment', 'refund'));

-- Lead keeps both totals; revenue = amount_paid - amount_refunded
alter table leads add column if not exists amount_refunded numeric not null default 0;

-- Let the public application form create leads (insert only, no reading)
drop policy if exists "public can submit applications" on leads;
create policy "public can submit applications"
  on leads for insert
  to anon
  with check (stage = 'Applicants' and source = 'landing_page');
