create type public.question_group_type as enum ('practice','demo','previous_year','mock','live_exam','certification');
create type public.group_visibility as enum ('hidden','registered','enrolled','scheduled');
create type public.approval_status as enum ('pending','approved','rejected');

create table public.question_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  group_type public.question_group_type not null default 'practice',
  visibility public.group_visibility not null default 'hidden',
  show_answers boolean not null default false,
  show_explanations boolean not null default false,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.questions alter column quiz_id drop not null;
alter table public.questions alter column focus_area_id drop not null;
alter table public.questions add column group_id uuid references public.question_groups(id) on delete set null;

alter table public.quizzes
  add column exam_timezone text not null default 'Asia/Riyadh',
  add column entry_window_minutes integer not null default 15 check (entry_window_minutes between 0 and 180),
  add column fixed_finish boolean not null default false,
  add column requires_enrollment boolean not null default false,
  add column maximum_attempts integer not null default 1 check (maximum_attempts between 1 and 20),
  add column allow_back_navigation boolean not null default true,
  add column show_score_after_submit boolean not null default true,
  add column release_answers_at timestamptz,
  add column certificate_requires_approval boolean not null default true;

create table public.exam_question_groups (
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  group_id uuid not null references public.question_groups(id) on delete cascade,
  question_count integer check (question_count is null or question_count > 0),
  primary key (quiz_id, group_id)
);

create table public.exam_enrollments (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  status public.approval_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (quiz_id, participant_id)
);

create table public.certificate_requests (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.quiz_attempts(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  status public.approval_status not null default 'pending',
  review_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index questions_group_idx on public.questions(group_id);
create index question_groups_type_idx on public.question_groups(group_type, is_active);
create index exam_enrollments_participant_idx on public.exam_enrollments(participant_id, status);
create index certificate_requests_status_idx on public.certificate_requests(status, created_at);

alter table public.question_groups enable row level security;
alter table public.exam_question_groups enable row level security;
alter table public.exam_enrollments enable row level security;
alter table public.certificate_requests enable row level security;

grant select, insert, update, delete on public.question_groups to authenticated;
grant select, insert, update, delete on public.exam_question_groups to authenticated;
grant select, insert, update, delete on public.exam_enrollments to authenticated;
grant select, insert, update, delete on public.certificate_requests to authenticated;

create policy "content managers manage question groups" on public.question_groups for all to authenticated
  using ((select public.can_manage_content())) with check ((select public.can_manage_content()));
create policy "students read available question groups" on public.question_groups for select to authenticated
  using (is_active and visibility <> 'hidden');

create policy "content managers manage exam group assignments" on public.exam_question_groups for all to authenticated
  using ((select public.can_manage_content())) with check ((select public.can_manage_content()));
create policy "students read published exam group assignments" on public.exam_question_groups for select to authenticated
  using (exists (select 1 from public.quizzes q where q.id = quiz_id and q.status = 'published'));

create policy "students manage own enrollments" on public.exam_enrollments for select to authenticated
  using (participant_id = (select auth.uid()) or (select public.can_review_results()));
create policy "students request enrollment" on public.exam_enrollments for insert to authenticated
  with check (participant_id = (select auth.uid()) and status = 'pending');
create policy "reviewers manage enrollments" on public.exam_enrollments for all to authenticated
  using ((select public.can_review_results())) with check ((select public.can_review_results()));

create policy "students read own certificate requests" on public.certificate_requests for select to authenticated
  using (participant_id = (select auth.uid()) or (select public.can_review_results()));
create policy "students request certificates" on public.certificate_requests for insert to authenticated
  with check (participant_id = (select auth.uid()) and status = 'pending');
create policy "reviewers manage certificate requests" on public.certificate_requests for all to authenticated
  using ((select public.can_review_results())) with check ((select public.can_review_results()));

drop policy if exists "public reads published quizzes" on public.quizzes;
create policy "authenticated reads eligible published quizzes" on public.quizzes for select to authenticated
  using (
    status = 'published'
    and (opens_at is null or opens_at <= now())
    and (closes_at is null or closes_at >= now())
    and (
      not requires_enrollment
      or exists (
        select 1 from public.exam_enrollments e
        where e.quiz_id = id and e.participant_id = (select auth.uid()) and e.status = 'approved'
      )
    )
  );

insert into public.question_groups(name, slug, description, group_type, visibility, show_answers, show_explanations, display_order)
values
  ('Practice Questions', 'practice-questions', 'Self-paced questions with answers and explanations.', 'practice', 'registered', true, true, 1),
  ('Demo Questions', 'demo-questions', 'A short introduction to the exam experience.', 'demo', 'registered', true, true, 2),
  ('Previous-Year Questions', 'previous-year-questions', 'Archived questions from earlier assessment cycles.', 'previous_year', 'enrolled', false, false, 3),
  ('Certification Question Bank', 'certification-question-bank', 'Private questions reserved for scheduled certification exams.', 'certification', 'hidden', false, false, 4);

drop policy if exists "authenticated reads eligible published quizzes" on public.quizzes;
create policy "authenticated reads published quizzes" on public.quizzes for select to authenticated
  using (status = 'published');

drop policy if exists "participants create own attempts" on public.quiz_attempts;

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
  if (select count(*) from public.quiz_attempts a where a.quiz_id = exam_id and a.participant_id = (select auth.uid())) >= exam.maximum_attempts
  then raise exception 'Maximum attempts reached'; end if;

  finish_at := now() + make_interval(mins => exam.time_limit_minutes);
  if exam.fixed_finish and exam.closes_at is not null then finish_at := least(finish_at, exam.closes_at); end if;
  insert into public.quiz_attempts(participant_id, quiz_id, expires_at)
  values((select auth.uid()), exam_id, finish_at) returning id into attempt_id;
  return attempt_id;
end;
$$;

create or replace function public.get_exam_questions(attempt_uuid uuid)
returns table(question_id uuid, question_text text, scenario_context text, display_order integer, options jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, q.question_text, q.scenario_context, q.display_order,
    coalesce(jsonb_agg(jsonb_build_object('id',o.id,'text',o.option_text,'order',o.display_order) order by o.display_order)
      filter (where o.id is not null), '[]'::jsonb)
  from public.quiz_attempts a
  join public.exam_question_groups eg on eg.quiz_id = a.quiz_id
  join public.questions q on q.group_id = eg.group_id and q.is_active
  left join public.question_options o on o.question_id = q.id
  where a.id = attempt_uuid and a.participant_id = (select auth.uid()) and a.status = 'in_progress' and a.expires_at > now()
  group by q.id, q.question_text, q.scenario_context, q.display_order
  order by q.display_order;
$$;

create or replace function public.submit_exam_attempt(attempt_uuid uuid, submitted_answers jsonb)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt public.quiz_attempts;
  exam public.quizzes;
  total_count integer;
  correct_count integer;
  result numeric(5,2);
begin
  select * into attempt from public.quiz_attempts a
  where a.id = attempt_uuid and a.participant_id = (select auth.uid()) and a.status = 'in_progress' for update;
  if not found then raise exception 'Attempt is unavailable'; end if;
  if attempt.expires_at < now() then raise exception 'Exam time has expired'; end if;
  select * into exam from public.quizzes q where q.id = attempt.quiz_id;

  insert into public.attempt_answers(attempt_id, question_id, selected_option_id, awarded_score)
  select attempt_uuid, (x->>'question_id')::uuid, (x->>'option_id')::uuid,
    case when o.is_correct then 1 else 0 end
  from jsonb_array_elements(submitted_answers) x
  join public.question_options o on o.id = (x->>'option_id')::uuid and o.question_id = (x->>'question_id')::uuid
  join public.questions q on q.id = o.question_id and q.is_active
  join public.exam_question_groups eg on eg.group_id = q.group_id and eg.quiz_id = attempt.quiz_id
  on conflict (attempt_id, question_id) do update set selected_option_id = excluded.selected_option_id, awarded_score = excluded.awarded_score;

  select count(*) into total_count from public.get_exam_questions(attempt_uuid);
  select count(*) into correct_count from public.attempt_answers aa where aa.attempt_id = attempt_uuid and aa.awarded_score > 0;
  result := case when total_count = 0 then 0 else round((correct_count::numeric / total_count::numeric) * 100, 2) end;

  update public.quiz_attempts set status = 'scored', submitted_at = now(), scored_at = now(), raw_score = correct_count,
    percentage = result, duration_seconds = extract(epoch from (now() - started_at))::integer where id = attempt_uuid;

  if result >= exam.pass_percentage and exam.certificate_requires_approval then
    insert into public.certificate_requests(attempt_id, participant_id, quiz_id)
    values(attempt_uuid, (select auth.uid()), attempt.quiz_id) on conflict (attempt_id) do nothing;
  end if;
  return result;
end;
$$;

revoke execute on function public.start_exam(uuid) from public, anon;
revoke execute on function public.get_exam_questions(uuid) from public, anon;
revoke execute on function public.submit_exam_attempt(uuid, jsonb) from public, anon;
grant execute on function public.start_exam(uuid) to authenticated;
grant execute on function public.get_exam_questions(uuid) to authenticated;
grant execute on function public.submit_exam_attempt(uuid, jsonb) to authenticated;
