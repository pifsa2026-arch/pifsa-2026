-- Run in Supabase → SQL Editor. Safe to run more than once.

create table if not exists completers (
  id             uuid primary key default gen_random_uuid(),
  certificate_no text not null check (length(trim(certificate_no)) > 0),
  full_name      text not null,
  program        text not null,
  batch          text not null,
  completed_on   date not null,
  created_at     timestamptz default now()
);

-- Certificate numbers are unique regardless of letter case
create unique index if not exists completers_certificate_idx
  on completers (upper(trim(certificate_no)));

alter table completers enable row level security;

-- Only logged-in staff can read or change the list
drop policy if exists "staff manage completers" on completers;
create policy "staff manage completers"
  on completers for all
  to authenticated
  using (true) with check (true);

-- Public verification: exact certificate number in, three fields out.
-- The public has no access to the table itself, so nobody can list completers.
create or replace function verify_certificate(cert text)
returns table (full_name text, program text, completed_on date)
language sql
stable
security definer
set search_path = public
as $$
  select c.full_name, c.program, c.completed_on
  from completers c
  where upper(trim(c.certificate_no)) = upper(trim(cert))
  limit 1;
$$;

revoke all on function verify_certificate(text) from public;
grant execute on function verify_certificate(text) to anon, authenticated;
