create table public.exam_delivery_settings (
  quiz_id uuid primary key references public.quizzes(id) on delete cascade,
  delivery_mode text not null default 'internal' check (delivery_mode in ('internal','external','hybrid')),
  provider text not null default 'Google Forms',
  external_url text,
  external_button_label text not null default 'Open external exam',
  instructions text not null default '',
  open_new_tab boolean not null default true,
  backup_enabled boolean not null default false,
  backup_url text,
  backup_button_label text not null default 'Open backup exam',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  check (external_url is null or external_url ~ '^https://'),
  check (backup_url is null or backup_url ~ '^https://')
);

create table public.external_exam_launches (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  destination text not null check (destination in ('primary','backup')),
  participant_code text not null,
  launched_at timestamptz not null default now()
);

create index external_exam_launches_participant_idx
  on public.external_exam_launches(participant_id, launched_at desc);
create index external_exam_launches_quiz_idx
  on public.external_exam_launches(quiz_id, launched_at desc);
create index exam_delivery_settings_updated_by_idx
  on public.exam_delivery_settings(updated_by);

alter table public.exam_delivery_settings enable row level security;
alter table public.external_exam_launches enable row level security;

grant select, insert, update, delete on public.exam_delivery_settings to authenticated;
grant select on public.external_exam_launches to authenticated;

create policy "content managers manage exam delivery" on public.exam_delivery_settings
  for all to authenticated
  using ((select public.can_manage_content()))
  with check ((select public.can_manage_content()));

create policy "participants read own external launches" on public.external_exam_launches
  for select to authenticated
  using (
    participant_id = (select auth.uid())
    or (select public.can_review_results())
  );

insert into public.exam_delivery_settings(quiz_id)
select id from public.quizzes
on conflict (quiz_id) do nothing;

create or replace function public.get_exam_delivery_catalog()
returns table(
  quiz_id uuid,
  delivery_mode text,
  provider text,
  external_button_label text,
  instructions text,
  open_new_tab boolean,
  backup_enabled boolean,
  backup_button_label text
)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id,
    coalesce(s.delivery_mode, 'internal'),
    coalesce(s.provider, 'Other'),
    coalesce(s.external_button_label, 'Open external exam'),
    coalesce(s.instructions, ''),
    coalesce(s.open_new_tab, true),
    coalesce(s.backup_enabled, false),
    coalesce(s.backup_button_label, 'Open backup exam')
  from public.quizzes q
  left join public.exam_delivery_settings s on s.quiz_id = q.id
  where (select auth.uid()) is not null and q.status = 'published';
$$;

create or replace function public.launch_external_exam(exam_id uuid, use_backup boolean default false)
returns table(url text, participant_code text, open_new_tab boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  exam public.quizzes;
  settings public.exam_delivery_settings;
  destination_name text;
  target_url text;
  access_code text;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;

  select * into exam from public.quizzes q where q.id = exam_id and q.status = 'published';
  if not found then raise exception 'Exam is unavailable'; end if;
  if exam.opens_at is not null and now() < exam.opens_at then raise exception 'Exam has not opened'; end if;
  if exam.closes_at is not null and now() > exam.closes_at then raise exception 'Exam has closed'; end if;
  if exam.requires_enrollment and not exists (
    select 1 from public.exam_enrollments e
    where e.quiz_id = exam_id and e.participant_id = (select auth.uid()) and e.status = 'approved'
  ) then raise exception 'Enrollment approval required'; end if;

  select * into settings from public.exam_delivery_settings s where s.quiz_id = exam_id;
  if not found then raise exception 'External delivery is not configured'; end if;

  if use_backup then
    if not settings.backup_enabled then raise exception 'The backup exam is not enabled'; end if;
    target_url := settings.backup_url;
    destination_name := 'backup';
  else
    if settings.delivery_mode not in ('external','hybrid') then raise exception 'This exam uses the secure internal platform'; end if;
    target_url := settings.external_url;
    destination_name := 'primary';
  end if;

  if target_url is null or target_url !~ '^https://' then raise exception 'A valid HTTPS exam link has not been configured'; end if;
  access_code := upper(substr(md5(exam_id::text || ':' || (select auth.uid())::text), 1, 10));

  insert into public.external_exam_launches(quiz_id, participant_id, destination, participant_code)
  values(exam_id, (select auth.uid()), destination_name, access_code);

  return query select target_url, access_code, settings.open_new_tab;
end;
$$;

create or replace function public.record_external_exam_result(exam_id uuid, student_id uuid, result_percentage numeric)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  exam public.quizzes;
  attempt_id uuid;
begin
  if (select auth.uid()) is null or not (select public.can_review_results()) then
    raise exception 'Administrator access required';
  end if;
  if result_percentage < 0 or result_percentage > 100 then raise exception 'Score must be between 0 and 100'; end if;
  select * into exam from public.quizzes q where q.id = exam_id;
  if not found then raise exception 'Exam not found'; end if;

  insert into public.quiz_attempts(
    participant_id, quiz_id, status, expires_at, submitted_at, scored_at,
    raw_score, percentage, duration_seconds
  ) values(
    student_id, exam_id, 'scored', now(), now(), now(),
    result_percentage, result_percentage, 0
  ) returning id into attempt_id;

  if result_percentage >= exam.pass_percentage and exam.certificate_requires_approval then
    insert into public.certificate_requests(attempt_id, participant_id, quiz_id)
    values(attempt_id, student_id, exam_id);
  end if;
  return attempt_id;
end;
$$;

revoke execute on function public.get_exam_delivery_catalog() from public, anon;
revoke execute on function public.launch_external_exam(uuid, boolean) from public, anon;
revoke execute on function public.record_external_exam_result(uuid, uuid, numeric) from public, anon;
grant execute on function public.get_exam_delivery_catalog() to authenticated;
grant execute on function public.launch_external_exam(uuid, boolean) to authenticated;
grant execute on function public.record_external_exam_result(uuid, uuid, numeric) to authenticated;

-- Seed three safe test questions in every built-in question group. These are
-- deliberately generic and can be edited or removed by an administrator.
do $$
declare
  group_row record;
  item record;
  new_question_id uuid;
  question_set jsonb;
begin
  for group_row in select id, group_type from public.question_groups loop
    question_set := case group_row.group_type::text
      when 'practice' then '[
        {"q":"Which action is the safest when you receive an unexpected link?","e":"Verify the sender and destination before opening an unexpected link.","o":["Open it immediately","Verify the sender first","Forward it to everyone","Share your password"],"c":1},
        {"q":"What is the best first step when two reliable sources disagree?","e":"Compare evidence, date, methods, and context before reaching a conclusion.","o":["Choose the first result","Ignore both sources","Compare their evidence","Ask social media to vote"],"c":2},
        {"q":"Which behaviour helps a team solve a difficult problem?","e":"Listening to different viewpoints helps teams identify stronger solutions.","o":["Interrupting others","Listening to different viewpoints","Hiding useful information","Avoiding all questions"],"c":1}
      ]'::jsonb
      when 'demo' then '[
        {"q":"A class has limited time for a project. What should the team do first?","e":"Clear priorities and responsibilities make limited time more useful.","o":["Start without a plan","Agree priorities and roles","Let one person do everything","Delay every decision"],"c":1},
        {"q":"Which password is generally the strongest?","e":"A long, unique passphrase is stronger than short or reused passwords.","o":["12345678","password","A long unique passphrase","Your first name"],"c":2},
        {"q":"When should personal information be shared online?","e":"Personal information should only be shared when necessary and with a trusted, appropriate recipient.","o":["Whenever requested","Only when necessary and trusted","In every public post","With unknown callers"],"c":1}
      ]'::jsonb
      when 'previous_year' then '[
        {"q":"Which response shows responsible global citizenship?","e":"Responsible action considers evidence, people, and long-term impact.","o":["Ignore other communities","Consider evidence and long-term impact","Spread an unverified claim","Choose only the fastest option"],"c":1},
        {"q":"What makes a source more trustworthy?","e":"A trustworthy source identifies evidence, authorship, and when information was published.","o":["It has a colourful title","It provides evidence and authorship","It has many advertisements","It makes a surprising claim"],"c":1},
        {"q":"A plan creates an unexpected problem. What is the strongest response?","e":"Reviewing evidence and adapting the plan demonstrates sound judgment.","o":["Hide the problem","Continue without review","Review evidence and adapt","Blame another person"],"c":2}
      ]'::jsonb
      else '[
        {"q":"Your team discovers that a result is based on incomplete data. What is the most responsible next step?","e":"Disclose the limitation, verify the missing information, and adjust the conclusion.","o":["Present it as final","Hide the limitation","Disclose and verify the missing information","Delete all records"],"c":2},
        {"q":"Which decision best protects student privacy?","e":"Collect only necessary data and restrict it to authorised people.","o":["Publish all student details","Collect only necessary data","Share passwords with the team","Keep data forever without reason"],"c":1},
        {"q":"A leader must choose between speed and safety. What should guide the decision?","e":"The decision should consider evidence, risk, affected people, and reversible options.","o":["Personal popularity","Evidence, risk, and impact","The loudest opinion","A random choice"],"c":1}
      ]'::jsonb end;

    for item in
      select * from jsonb_to_recordset(question_set)
        as x(q text, e text, o jsonb, c integer)
    loop
      if not exists (
        select 1 from public.questions q
        where q.group_id = group_row.id and q.question_text = item.q
      ) then
        insert into public.questions(group_id, question_text, explanation, difficulty, display_order)
        values(
          group_row.id, item.q, item.e, 1,
          coalesce((select max(display_order) + 1 from public.questions where group_id = group_row.id), 1)
        ) returning id into new_question_id;

        insert into public.question_options(question_id, option_text, is_correct, display_order)
        select new_question_id, value, false, ordinality - 1
        from jsonb_array_elements_text(item.o) with ordinality
        -- Correct the boolean in a separate update for clarity.
        ;
        update public.question_options
        set is_correct = (display_order = item.c)
        where question_id = new_question_id;
      end if;
    end loop;
  end loop;
end;
$$;

create or replace function public.prevent_empty_internal_exam_publish()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  mode text;
  active_count integer;
begin
  if new.status = 'published' then
    select coalesce(s.delivery_mode, 'internal') into mode
    from (select new.id as quiz_id) x
    left join public.exam_delivery_settings s on s.quiz_id = x.quiz_id;

    if mode in ('internal','hybrid') then
      select count(*) into active_count
      from public.exam_question_groups eg
      join public.questions q on q.group_id = eg.group_id and q.is_active
      where eg.quiz_id = new.id;
      if active_count = 0 then
        raise exception 'Add at least one active question before publishing an internal exam';
      end if;
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.prevent_empty_internal_exam_publish() from public, anon, authenticated;
drop trigger if exists prevent_empty_internal_exam_publish on public.quizzes;
create trigger prevent_empty_internal_exam_publish
  before insert or update of status on public.quizzes
  for each row execute function public.prevent_empty_internal_exam_publish();

create or replace function public.start_exam(exam_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  exam public.quizzes;
  attempt_id uuid;
  finish_at timestamptz;
  delivery_mode text;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  select * into exam from public.quizzes q where q.id = exam_id and q.status = 'published';
  if not found then raise exception 'Exam is unavailable'; end if;
  select coalesce(s.delivery_mode, 'internal') into delivery_mode
  from (select exam_id as quiz_id) x left join public.exam_delivery_settings s on s.quiz_id=x.quiz_id;
  if delivery_mode = 'external' then raise exception 'Use the external exam button for this assessment'; end if;
  if not exists (
    select 1 from public.exam_question_groups eg
    join public.questions q on q.group_id=eg.group_id and q.is_active
    where eg.quiz_id=exam_id
  ) then raise exception 'No active questions are assigned to this exam. Please contact the administrator.'; end if;
  if exam.opens_at is not null and now() < exam.opens_at then raise exception 'Exam has not opened'; end if;
  if exam.closes_at is not null and now() > exam.closes_at then raise exception 'Exam has closed'; end if;
  if exam.requires_enrollment and not exists (
    select 1 from public.exam_enrollments e
    where e.quiz_id=exam_id and e.participant_id=(select auth.uid()) and e.status='approved'
  ) then raise exception 'Enrollment approval required'; end if;
  select a.id into attempt_id from public.quiz_attempts a
  where a.quiz_id=exam_id and a.participant_id=(select auth.uid())
    and a.status='in_progress' and a.expires_at>now()
  order by a.started_at desc limit 1;
  if attempt_id is not null then return attempt_id; end if;
  update public.quiz_attempts set status='expired'
  where quiz_id=exam_id and participant_id=(select auth.uid()) and status='in_progress' and expires_at<=now();
  if (select count(*) from public.quiz_attempts a where a.quiz_id=exam_id and a.participant_id=(select auth.uid())) >= exam.maximum_attempts
    then raise exception 'Maximum attempts reached. Contact the administrator if a technical problem prevented completion.';
  end if;
  finish_at := now() + make_interval(mins => exam.time_limit_minutes);
  if exam.fixed_finish and exam.closes_at is not null then finish_at := least(finish_at, exam.closes_at); end if;
  insert into public.quiz_attempts(participant_id,quiz_id,expires_at)
  values((select auth.uid()),exam_id,finish_at) returning id into attempt_id;
  return attempt_id;
end;
$$;

revoke execute on function public.start_exam(uuid) from public, anon;
grant execute on function public.start_exam(uuid) to authenticated;
