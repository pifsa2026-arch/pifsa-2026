-- ═══════════════════════════════════════════════════════════════════════════
-- PIFSA — staff roles, examinees, online exams, live chat
-- Run this whole file in Supabase → SQL Editor. Safe to run more than once.
--
-- BEFORE RUNNING: make sure every staff member's login email is listed in
-- either the `admins` table or the `staff` table (section 1). After this
-- script, ONLY those people can open the CRM, Completers, Exams and Chat.
-- Examinees who sign up on the website can only see their own exams.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. ROLES ──────────────────────────────────────────────────────────────
create table if not exists admins (email text primary key);
create table if not exists staff (email text primary key, added_at timestamptz default now());

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where lower(email) = lower(auth.jwt() ->> 'email'))
      or exists (select 1 from staff  where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

grant execute on function is_admin(), is_staff() to anon, authenticated;

-- Add your team here (admins can already do everything):
-- insert into staff (email) values ('someone@example.com') on conflict do nothing;


-- ─── 2. LOCK EXISTING TABLES TO STAFF ──────────────────────────────────────
-- Replaces every old "any logged-in user" policy, so examinee accounts can't
-- read leads, payments, notes, automations, expenses or completers.
do $$
declare t text; p record;
begin
  foreach t in array array['leads','payments','lead_notes','automations','automation_jobs','completers','expenses'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table %I enable row level security', t);
      for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
        execute format('drop policy %I on %I', p.policyname, t);
      end loop;
      execute format('create policy "staff full access" on %I for all to authenticated using (is_staff()) with check (is_staff())', t);
    end if;
  end loop;

  -- Landing page content: everyone can read, only admins can change
  if to_regclass('public.events') is not null then
    alter table events enable row level security;
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'events' loop
      execute format('drop policy %I on events', p.policyname);
    end loop;
    create policy "public reads events" on events for select to anon, authenticated using (true);
    create policy "admins manage events" on events for all to authenticated using (is_admin()) with check (is_admin());
  end if;

  -- Role tables: staff can see the lists, only admins can change them
  foreach t in array array['admins','staff'] loop
    execute format('alter table %I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on %I', p.policyname, t);
    end loop;
    execute format('create policy "staff read" on %I for select to authenticated using (is_staff())', t);
    execute format('create policy "admins manage" on %I for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- The public application form keeps working (insert only, no reading)
drop policy if exists "public can submit applications" on leads;
create policy "public can submit applications" on leads for insert to anon, authenticated
  with check (stage = 'Applicants' and source = 'landing_page');


-- ─── 3. EXAMINEES & GROUPS ─────────────────────────────────────────────────
create table if not exists examinees (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text not null,
  email          text not null,
  contact_number text,
  status         text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at     timestamptz default now(),
  decided_at     timestamptz
);

create table if not exists examinee_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  created_at  timestamptz default now()
);

create table if not exists examinee_group_members (
  group_id    uuid references examinee_groups (id) on delete cascade,
  examinee_id uuid references examinees (id) on delete cascade,
  primary key (group_id, examinee_id)
);

-- Sign-ups from the exam portal become pending examinees automatically
create or replace function handle_new_examinee() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'role', '') = 'examinee' then
    insert into examinees (id, full_name, email, contact_number)
    values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), new.email),
            new.email, new.raw_user_meta_data ->> 'contact_number')
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created_examinee on auth.users;
create trigger on_auth_user_created_examinee after insert on auth.users
  for each row execute function handle_new_examinee();


-- ─── 4. EXAMS ──────────────────────────────────────────────────────────────
create table if not exists exams (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  instructions     text,
  duration_minutes int not null default 60 check (duration_minutes > 0),
  passing_score    numeric not null default 75 check (passing_score between 0 and 100),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table if not exists exam_questions (
  id       uuid primary key default gen_random_uuid(),
  exam_id  uuid not null references exams (id) on delete cascade,
  position int not null,
  type     text not null check (type in ('mc', 'tf', 'identification', 'essay')),
  prompt   text not null,
  choices  jsonb not null default '[]',
  points   numeric not null default 1 check (points >= 0)
);
create index if not exists exam_questions_exam_idx on exam_questions (exam_id, position);

-- Correct answers live in their own table that examinees can never read.
-- Identification answers may list alternatives separated by |
create table if not exists exam_answer_keys (
  question_id uuid primary key references exam_questions (id) on delete cascade,
  answer      text not null
);

create table if not exists exam_assignments (
  id          uuid primary key default gen_random_uuid(),
  exam_id     uuid not null references exams (id) on delete cascade,
  group_id    uuid references examinee_groups (id) on delete cascade,
  examinee_id uuid references examinees (id) on delete cascade,
  opens_at    timestamptz,
  closes_at   timestamptz,
  created_at  timestamptz default now(),
  check ((group_id is null) <> (examinee_id is null))
);

create table if not exists exam_attempts (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references exam_assignments (id) on delete cascade,
  exam_id       uuid not null references exams (id) on delete cascade,
  examinee_id   uuid not null references examinees (id) on delete cascade,
  attempt_no    int not null,
  started_at    timestamptz not null default now(),
  due_at        timestamptz not null,
  submitted_at  timestamptz,
  answers       jsonb not null default '{}',
  auto_score    numeric,
  essay_scores  jsonb not null default '{}',
  score         numeric,
  max_score     numeric,
  status        text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'graded')),
  unique (assignment_id, examinee_id, attempt_no)
);

create table if not exists retake_requests (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references exam_assignments (id) on delete cascade,
  examinee_id   uuid not null references examinees (id) on delete cascade,
  reason        text,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'denied', 'used')),
  created_at    timestamptz default now(),
  decided_at    timestamptz
);


-- ─── 5. LIVE CHAT ──────────────────────────────────────────────────────────
create table if not exists chat_conversations (
  id              uuid primary key default gen_random_uuid(),
  token           uuid not null unique default gen_random_uuid(),
  visitor_name    text not null,
  visitor_email   text,
  status          text not null default 'open' check (status in ('open', 'closed')),
  unread_staff    int not null default 0,
  created_at      timestamptz default now(),
  last_message_at timestamptz default now()
);

create table if not exists chat_messages (
  id              bigserial primary key,
  conversation_id uuid not null references chat_conversations (id) on delete cascade,
  sender          text not null check (sender in ('visitor', 'staff')),
  body            text not null check (length(body) between 1 and 2000),
  staff_email     text,
  created_at      timestamptz default now()
);
create index if not exists chat_messages_conv_idx on chat_messages (conversation_id, id);

create or replace function chat_after_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update chat_conversations
     set last_message_at = new.created_at,
         status = 'open',
         unread_staff = case when new.sender = 'visitor' then unread_staff + 1 else 0 end
   where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists chat_messages_after_insert on chat_messages;
create trigger chat_messages_after_insert after insert on chat_messages
  for each row execute function chat_after_message();


-- ─── 6. POLICIES FOR THE NEW TABLES ────────────────────────────────────────
-- Staff manage everything; examinees and visitors only go through the
-- functions in sections 7–8, which never return answer keys.
do $$
declare t text; p record;
begin
  foreach t in array array['examinees','examinee_groups','examinee_group_members','exams','exam_questions',
                           'exam_answer_keys','exam_assignments','exam_attempts','retake_requests',
                           'chat_conversations','chat_messages'] loop
    execute format('alter table %I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on %I', p.policyname, t);
    end loop;
    execute format('create policy "staff full access" on %I for all to authenticated using (is_staff()) with check (is_staff())', t);
  end loop;
end $$;

create policy "examinee reads own profile" on examinees for select to authenticated using (id = auth.uid());

-- Live updates for the staff chat inbox
do $$
begin
  alter publication supabase_realtime add table chat_messages;
exception when others then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table chat_conversations;
exception when others then null;
end $$;


-- ─── 7. EXAMINEE FUNCTIONS ─────────────────────────────────────────────────
create or replace function _approved_examinee() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from examinees where id = auth.uid() and status = 'approved');
$$;

create or replace function _my_assignment(p_assignment uuid) returns exam_assignments
language sql stable security definer set search_path = public as $$
  select a.* from exam_assignments a
   where a.id = p_assignment
     and (a.examinee_id = auth.uid()
          or a.group_id in (select group_id from examinee_group_members where examinee_id = auth.uid()));
$$;

create or replace function my_exams()
returns table (
  assignment_id uuid, exam_id uuid, title text, description text, duration_minutes int,
  question_count int, opens_at timestamptz, closes_at timestamptz, passing_score numeric,
  attempts_used int, last_status text, last_score numeric, last_max numeric,
  in_progress_attempt uuid, retake_status text, can_start boolean
)
language sql stable security definer set search_path = public as $$
  with mine as (
    select a.* from exam_assignments a
     where _approved_examinee()
       and (a.examinee_id = auth.uid()
            or a.group_id in (select group_id from examinee_group_members where examinee_id = auth.uid()))
  )
  select m.id, e.id, e.title, e.description, e.duration_minutes,
         (select count(*)::int from exam_questions q where q.exam_id = e.id),
         m.opens_at, m.closes_at, e.passing_score,
         coalesce(att.n, 0),
         lst.status, lst.score, lst.max_score,
         live.id,
         rr.status,
         ( (m.opens_at is null or m.opens_at <= now())
           and (m.closes_at is null or m.closes_at > now())
           and (live.id is not null or coalesce(att.n, 0) = 0 or rr.status = 'approved') )
    from mine m
    join exams e on e.id = m.exam_id
    left join lateral (select count(*)::int as n from exam_attempts x
                        where x.assignment_id = m.id and x.examinee_id = auth.uid()) att on true
    left join lateral (select x.status, x.score, x.max_score from exam_attempts x
                        where x.assignment_id = m.id and x.examinee_id = auth.uid() and x.status <> 'in_progress'
                        order by x.attempt_no desc limit 1) lst on true
    left join lateral (select x.id from exam_attempts x
                        where x.assignment_id = m.id and x.examinee_id = auth.uid()
                          and x.status = 'in_progress' and x.due_at + interval '2 minutes' > now()
                        limit 1) live on true
    left join lateral (select r.status from retake_requests r
                        where r.assignment_id = m.id and r.examinee_id = auth.uid() and r.status <> 'used'
                        order by r.created_at desc limit 1) rr on true
   order by coalesce(m.closes_at, 'infinity'::timestamptz), e.title;
$$;

-- Grades an attempt from the stored answers. Used on submit and when the timer runs out.
create or replace function _grade_attempt(p_attempt uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_answers jsonb; v_auto numeric := 0; v_has_essay boolean := false; q record; given text; key text; ok boolean;
begin
  select answers into v_answers from exam_attempts where id = p_attempt;
  for q in
    select eq.id, eq.type, eq.points, k.answer
      from exam_attempts a
      join exam_questions eq on eq.exam_id = a.exam_id
      left join exam_answer_keys k on k.question_id = eq.id
     where a.id = p_attempt
  loop
    if q.type = 'essay' then v_has_essay := true; continue; end if;
    given := lower(regexp_replace(trim(coalesce(v_answers ->> q.id::text, '')), '\s+', ' ', 'g'));
    key   := lower(trim(coalesce(q.answer, '')));
    if given = '' or key = '' then continue; end if;
    if q.type = 'tf' then
      given := case when given in ('t', 'true')  then 'true'  when given in ('f', 'false') then 'false' else given end;
      key   := case when key   in ('t', 'true')  then 'true'  when key   in ('f', 'false') then 'false' else key end;
      ok := given = key;
    elsif q.type = 'identification' then
      ok := given = any (select lower(regexp_replace(trim(x), '\s+', ' ', 'g')) from unnest(string_to_array(key, '|')) x);
    else
      ok := given = key;
    end if;
    if ok then v_auto := v_auto + q.points; end if;
  end loop;

  update exam_attempts
     set auto_score   = v_auto,
         score        = case when v_has_essay then null else v_auto end,
         status       = case when v_has_essay then 'submitted' else 'graded' end,
         submitted_at = coalesce(submitted_at, now())
   where id = p_attempt;
end $$;

-- Closes out any of my attempts whose timer has run out
create or replace function _expire_my_attempts() returns void
language plpgsql security definer set search_path = public as $$
declare a record;
begin
  for a in select id from exam_attempts
            where examinee_id = auth.uid() and status = 'in_progress' and due_at + interval '2 minutes' <= now() loop
    perform _grade_attempt(a.id);
  end loop;
end $$;

create or replace function start_attempt(p_assignment uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  a exam_assignments; e exams; v_live uuid; v_used int; v_retake uuid; v_id uuid; v_max numeric;
begin
  if not _approved_examinee() then raise exception 'Your account is not approved yet.'; end if;
  perform _expire_my_attempts();
  a := _my_assignment(p_assignment);
  if a.id is null then raise exception 'This exam is not assigned to you.'; end if;
  if a.opens_at is not null and a.opens_at > now() then raise exception 'This exam is not open yet.'; end if;
  if a.closes_at is not null and a.closes_at <= now() then raise exception 'This exam is already closed.'; end if;

  select id into v_live from exam_attempts
   where assignment_id = a.id and examinee_id = auth.uid() and status = 'in_progress' limit 1;
  if v_live is not null then return v_live; end if;

  select count(*) into v_used from exam_attempts where assignment_id = a.id and examinee_id = auth.uid();
  if v_used > 0 then
    select id into v_retake from retake_requests
     where assignment_id = a.id and examinee_id = auth.uid() and status = 'approved'
     order by created_at limit 1;
    if v_retake is null then raise exception 'You already took this exam. Request a retake to try again.'; end if;
    update retake_requests set status = 'used' where id = v_retake;
  end if;

  select * into e from exams where id = a.exam_id;
  select coalesce(sum(points), 0) into v_max from exam_questions where exam_id = e.id;
  insert into exam_attempts (assignment_id, exam_id, examinee_id, attempt_no, due_at, max_score)
  values (a.id, e.id, auth.uid(), v_used + 1, now() + make_interval(mins => e.duration_minutes), v_max)
  returning id into v_id;
  return v_id;
end $$;

-- Questions for an attempt WITHOUT answers
create or replace function get_attempt(p_attempt uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_att exam_attempts; e exams;
begin
  perform _expire_my_attempts();
  select * into v_att from exam_attempts where id = p_attempt and examinee_id = auth.uid();
  if v_att.id is null then raise exception 'Attempt not found.'; end if;
  select * into e from exams where id = v_att.exam_id;
  return jsonb_build_object(
    'attempt', jsonb_build_object('id', v_att.id, 'status', v_att.status, 'due_at', v_att.due_at, 'answers', v_att.answers,
                                  'score', v_att.score, 'max_score', v_att.max_score, 'attempt_no', v_att.attempt_no,
                                  'server_now', now()),
    'exam', jsonb_build_object('title', e.title, 'instructions', e.instructions, 'passing_score', e.passing_score),
    'questions', case when v_att.status = 'in_progress' then (
      select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'type', q.type, 'prompt', q.prompt,
                                                   'choices', q.choices, 'points', q.points) order by q.position), '[]')
        from exam_questions q where q.exam_id = e.id) else '[]'::jsonb end
  );
end $$;

create or replace function save_attempt(p_attempt uuid, p_answers jsonb) returns void
language sql security definer set search_path = public as $$
  update exam_attempts set answers = coalesce(p_answers, '{}')
   where id = p_attempt and examinee_id = auth.uid() and status = 'in_progress'
     and due_at + interval '2 minutes' > now();
$$;

create or replace function submit_attempt(p_attempt uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_att exam_attempts;
begin
  select * into v_att from exam_attempts where id = p_attempt and examinee_id = auth.uid();
  if v_att.id is null then raise exception 'Attempt not found.'; end if;
  if v_att.status = 'in_progress' then
    -- Answers sent after the timer (plus a short grace period) are ignored; the last autosave counts
    if v_att.due_at + interval '2 minutes' > now() then
      update exam_attempts set answers = coalesce(p_answers, '{}') where id = v_att.id;
    end if;
    perform _grade_attempt(v_att.id);
  end if;
  select * into v_att from exam_attempts where id = p_attempt;
  return jsonb_build_object('status', v_att.status, 'score', v_att.score, 'max_score', v_att.max_score);
end $$;

create or replace function request_retake(p_assignment uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare a exam_assignments;
begin
  if not _approved_examinee() then raise exception 'Your account is not approved yet.'; end if;
  a := _my_assignment(p_assignment);
  if a.id is null then raise exception 'This exam is not assigned to you.'; end if;
  if not exists (select 1 from exam_attempts where assignment_id = a.id and examinee_id = auth.uid() and status <> 'in_progress') then
    raise exception 'You can only request a retake after finishing the exam.';
  end if;
  if exists (select 1 from retake_requests where assignment_id = a.id and examinee_id = auth.uid() and status in ('pending', 'approved')) then
    raise exception 'You already have a retake request for this exam.';
  end if;
  insert into retake_requests (assignment_id, examinee_id, reason) values (a.id, auth.uid(), left(p_reason, 500));
end $$;

-- Staff can regrade after fixing an answer key; examinees cannot call this
create or replace function regrade_attempt(p_attempt uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'Not allowed.'; end if;
  perform _grade_attempt(p_attempt);
  update exam_attempts x
     set score  = x.auto_score + (select coalesce(sum(v::numeric), 0) from jsonb_each_text(x.essay_scores) as t(k, v)),
         status = 'graded'
   where x.id = p_attempt and x.essay_scores <> '{}';
end $$;

-- Internal helpers are only called from inside the functions above
revoke all on function _approved_examinee(), _my_assignment(uuid), _grade_attempt(uuid), _expire_my_attempts()
  from public, anon, authenticated;
revoke all on function my_exams(), start_attempt(uuid), get_attempt(uuid), save_attempt(uuid, jsonb),
                       submit_attempt(uuid, jsonb), request_retake(uuid, text), regrade_attempt(uuid) from public, anon;
grant execute on function my_exams(), start_attempt(uuid), get_attempt(uuid), save_attempt(uuid, jsonb),
                          submit_attempt(uuid, jsonb), request_retake(uuid, text), regrade_attempt(uuid) to authenticated;


-- ─── 8. VISITOR CHAT FUNCTIONS (anonymous, token-based) ────────────────────
create or replace function chat_start(p_name text, p_email text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c chat_conversations;
begin
  if length(trim(coalesce(p_name, ''))) not between 1 and 80 then raise exception 'Please enter your name.'; end if;
  insert into chat_conversations (visitor_name, visitor_email)
  values (trim(p_name), nullif(left(trim(coalesce(p_email, '')), 120), ''))
  returning * into c;
  return jsonb_build_object('id', c.id, 'token', c.token);
end $$;

create or replace function chat_send(p_token uuid, p_body text) returns bigint
language plpgsql security definer set search_path = public as $$
declare c chat_conversations; v_id bigint;
begin
  select * into c from chat_conversations where token = p_token;
  if c.id is null then raise exception 'Conversation not found.'; end if;
  if length(trim(coalesce(p_body, ''))) = 0 then raise exception 'Message is empty.'; end if;
  if (select count(*) from chat_messages where conversation_id = c.id and sender = 'visitor'
        and created_at > now() - interval '1 minute') >= 15 then
    raise exception 'You are sending messages too quickly. Please wait a moment.';
  end if;
  insert into chat_messages (conversation_id, sender, body) values (c.id, 'visitor', left(trim(p_body), 2000))
  returning id into v_id;
  return v_id;
end $$;

create or replace function chat_fetch(p_token uuid, p_after bigint)
returns table (id bigint, sender text, body text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, m.sender, m.body, m.created_at
    from chat_messages m join chat_conversations c on c.id = m.conversation_id
   where c.token = p_token and m.id > coalesce(p_after, 0)
   order by m.id limit 200;
$$;

grant execute on function chat_start(text, text), chat_send(uuid, text), chat_fetch(uuid, bigint) to anon, authenticated;
