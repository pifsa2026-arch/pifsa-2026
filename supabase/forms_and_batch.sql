-- ═══════════════════════════════════════════════════════════════════════════
-- PIFSA — online forms (Google Form replacement) + batch number in verification
-- Run in Supabase → SQL Editor AFTER roles_exams_chat.sql. Safe to run again.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. FORMS ──────────────────────────────────────────────────────────────
-- questions is a list like:
--   { "id": "...", "type": "short|paragraph|email|phone|number|date|mc|checkbox|dropdown|section",
--     "label": "...", "help": "...", "required": true, "options": ["..."], "lead_field": "full_name|email|contact_number|program|training_duration" }
create table if not exists forms (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
  title           text not null,
  description     text,
  banner_url      text,
  theme_color     text not null default '#00264d',
  is_open         boolean not null default true,
  closed_message  text,
  success_message text,
  create_lead     boolean not null default false,
  questions       jsonb not null default '[]',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- The main form is the one shown at the permanent link /apply
alter table forms add column if not exists is_primary boolean not null default false;
create unique index if not exists forms_one_primary on forms (is_primary) where is_primary;

-- Training details shown at the top of a registration form:
--   { class_code, program, training_duration, blocks: [{ id, label, text }] }
-- program and training_duration also fill every lead created from the form
alter table forms add column if not exists details jsonb not null default '{}';

create table if not exists form_responses (
  id         uuid primary key default gen_random_uuid(),
  form_id    uuid not null references forms (id) on delete cascade,
  answers    jsonb not null,
  lead_id    text,
  created_at timestamptz default now()
);
create index if not exists form_responses_form_idx on form_responses (form_id, created_at desc);

do $$
declare t text; p record;
begin
  foreach t in array array['forms','form_responses'] loop
    execute format('alter table %I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on %I', p.policyname, t);
    end loop;
  end loop;
end $$;

-- Anyone with the link can load a form; only admins create or edit forms
create policy "public reads forms" on forms for select to anon, authenticated using (true);
create policy "admins manage forms" on forms for all to authenticated using (is_admin()) with check (is_admin());
-- Responses are only readable by staff; the public submits through submit_form() below
create policy "staff read responses" on form_responses for select to authenticated using (is_staff());
create policy "admins delete responses" on form_responses for delete to authenticated using (is_admin());

-- Validates and stores a response, then creates or updates the CRM lead (source: Exclusive Form).
-- Same email + same training duration updates that lead; otherwise a new Applicant is created.
create or replace function submit_form(p_slug text, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  f forms; q jsonb; v jsonb; missing text[] := '{}'; clean jsonb := '{}'; v_lead_id text; existing leads;
  v_name text; v_email text; v_phone text; v_duration text; v_work text; v_programs text[] := '{}';
begin
  select * into f from forms where slug = p_slug;
  if f.id is null then raise exception 'This form does not exist.'; end if;
  if not f.is_open then raise exception 'This form is no longer accepting responses.'; end if;
  if octet_length(p_answers::text) > 200000 then raise exception 'Your answers are too long.'; end if;

  for q in select * from jsonb_array_elements(f.questions) loop
    continue when q ->> 'type' = 'section';
    v := p_answers -> (q ->> 'id');
    if coalesce((q ->> 'required')::boolean, false)
       and (v is null or v = 'null'::jsonb or (jsonb_typeof(v) = 'string' and trim(v #>> '{}') = '')
            or (jsonb_typeof(v) = 'array' and jsonb_array_length(v) = 0)) then
      missing := missing || (q ->> 'label');
    end if;
    if v is not null then clean := clean || jsonb_build_object(q ->> 'id', v); end if;

    case q ->> 'lead_field'
      when 'full_name' then v_name := v #>> '{}';
      when 'email' then v_email := v #>> '{}';
      when 'contact_number' then v_phone := v #>> '{}';
      when 'current_work' then v_work := v #>> '{}';
      when 'training_duration' then v_duration := v #>> '{}';
      when 'program' then
        if jsonb_typeof(v) = 'array' then v_programs := array(select jsonb_array_elements_text(v));
        elsif v is not null and trim(v #>> '{}') <> '' then v_programs := array[v #>> '{}']; end if;
      else null;
    end case;
  end loop;

  if array_length(missing, 1) > 0 then
    raise exception 'Please answer the required questions: %', array_to_string(missing, ', ');
  end if;

  v_name := nullif(trim(coalesce(v_name, '')), '');
  v_email := nullif(lower(trim(coalesce(v_email, ''))), '');
  v_phone := nullif(trim(coalesce(v_phone, '')), '');
  v_work := nullif(trim(coalesce(v_work, '')), '');
  -- The form's own training program and duration apply when the form does not ask for them
  v_duration := coalesce(nullif(trim(coalesce(v_duration, '')), ''), nullif(trim(coalesce(f.details ->> 'training_duration', '')), ''));
  if coalesce(array_length(v_programs, 1), 0) = 0 and nullif(trim(coalesce(f.details ->> 'program', '')), '') is not null then
    v_programs := array[trim(f.details ->> 'program')];
  end if;

  if v_name is not null or v_email is not null then
    if v_email is not null then
      select * into existing from leads
       where lower(email) = v_email and coalesce(training_duration, '') = coalesce(v_duration, '')
       order by created_at desc limit 1;
    end if;

    if existing.id is not null then
      update leads
         set full_name      = coalesce(v_name, full_name),
             contact_number = coalesce(v_phone, contact_number),
             current_work   = coalesce(v_work, current_work),
             programs       = array(select distinct p from unnest(coalesce(programs, '{}') || v_programs) p where p <> ''),
             training_duration = coalesce(v_duration, training_duration)
       where id = existing.id;
      v_lead_id := existing.id::text;
    else
      insert into leads (full_name, email, contact_number, current_work, programs, training_duration, stage, source)
      values (coalesce(v_name, v_email), v_email, v_phone, v_work, v_programs, v_duration, 'Applicants', 'exclusive_form')
      returning id::text into v_lead_id;
    end if;
  end if;

  insert into form_responses (form_id, answers, lead_id) values (f.id, clean, v_lead_id);
  return jsonb_build_object('ok', true, 'message', coalesce(f.success_message, 'Thank you! Your response has been recorded.'));
end $$;

revoke all on function submit_form(text, jsonb) from public;
grant execute on function submit_form(text, jsonb) to anon, authenticated;


-- File uploads (proof of payment): private bucket, images or PDF up to 10 MB.
-- Applicants can upload; only staff can open the files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('form-uploads', 'form-uploads', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "applicants upload form files" on storage.objects;
drop policy if exists "staff read form files" on storage.objects;
drop policy if exists "admins delete form files" on storage.objects;
create policy "applicants upload form files" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'form-uploads');
create policy "staff read form files" on storage.objects for select to authenticated
  using (bucket_id = 'form-uploads' and is_staff());
create policy "admins delete form files" on storage.objects for delete to authenticated
  using (bucket_id = 'form-uploads' and is_admin());


-- ─── 2. BATCH NUMBER IN VERIFICATION ───────────────────────────────────────
-- Lookup is still by certificate number only; the batch number is now shown in the result.
drop function if exists verify_certificate(text);
create function verify_certificate(cert text)
returns table (full_name text, program text, completed_on date, batch text)
language sql stable security definer set search_path = public as $$
  select c.full_name, c.program, c.completed_on, c.batch
    from completers c
   where upper(trim(c.certificate_no)) = upper(trim(cert))
   limit 1;
$$;
revoke all on function verify_certificate(text) from public;
grant execute on function verify_certificate(text) to anon, authenticated;
