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
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select * into exam
  from public.quizzes q
  where q.id = exam_id and q.status = 'published';

  if not found then raise exception 'Exam is unavailable'; end if;
  if exam.opens_at is not null and now() < exam.opens_at then raise exception 'Exam has not opened'; end if;
  if exam.closes_at is not null and now() > exam.closes_at then raise exception 'Exam has closed'; end if;

  if exam.requires_enrollment and not exists (
    select 1 from public.exam_enrollments e
    where e.quiz_id = exam_id
      and e.participant_id = (select auth.uid())
      and e.status = 'approved'
  ) then
    raise exception 'Enrollment approval required';
  end if;

  -- A second click, refresh, or closed browser must resume the same live
  -- attempt instead of consuming another attempt or blocking the student.
  select a.id into attempt_id
  from public.quiz_attempts a
  where a.quiz_id = exam_id
    and a.participant_id = (select auth.uid())
    and a.status = 'in_progress'
    and a.expires_at > now()
  order by a.started_at desc
  limit 1;

  if attempt_id is not null then
    return attempt_id;
  end if;

  update public.quiz_attempts
  set status = 'expired'
  where quiz_id = exam_id
    and participant_id = (select auth.uid())
    and status = 'in_progress'
    and expires_at <= now();

  if (
    select count(*)
    from public.quiz_attempts a
    where a.quiz_id = exam_id
      and a.participant_id = (select auth.uid())
  ) >= exam.maximum_attempts then
    raise exception 'Maximum attempts reached. Contact the administrator if a technical problem prevented completion.';
  end if;

  finish_at := now() + make_interval(mins => exam.time_limit_minutes);
  if exam.fixed_finish and exam.closes_at is not null then
    finish_at := least(finish_at, exam.closes_at);
  end if;

  insert into public.quiz_attempts(participant_id, quiz_id, expires_at)
  values((select auth.uid()), exam_id, finish_at)
  returning id into attempt_id;

  return attempt_id;
end;
$$;

revoke execute on function public.start_exam(uuid) from public, anon;
grant execute on function public.start_exam(uuid) to authenticated;
