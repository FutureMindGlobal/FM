create extension if not exists pgcrypto;

create type public.user_role as enum ('participant','reviewer','editor','admin');
create type public.content_status as enum ('draft','scheduled','published','archived');
create type public.attempt_status as enum ('in_progress','submitted','scored','expired');
create type public.certificate_level as enum ('participation','achievement','distinction');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'participant',
  country_code char(2),
  birth_year integer check (birth_year between 1990 and extract(year from now())::int),
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.focus_areas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  icon text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  logo_url text,
  primary_color text not null default '#061329',
  secondary_color text not null default '#0b2144',
  accent_color text not null default '#18d9e5',
  background_color text not null default '#f4f2ec',
  text_color text not null default '#0b1b33',
  font_family text not null default 'Geist',
  base_font_size integer not null default 16 check (base_font_size between 14 and 20),
  heading_scale numeric(3,2) not null default 1.60 check (heading_scale between 1.20 and 2.50),
  hero_title text not null default 'Think beyond borders. Lead what comes next.',
  hero_subtitle text not null default 'Build the human capabilities that shape the future.',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  pathway text not null check (pathway in ('explorer','pioneer','global_leader')),
  status public.content_status not null default 'draft',
  time_limit_minutes integer not null check (time_limit_minutes between 5 and 180),
  pass_percentage integer not null default 75 check (pass_percentage between 1 and 100),
  distinction_percentile integer not null default 90 check (distinction_percentile between 50 and 100),
  retake_lock_hours integer not null default 24 check (retake_lock_hours between 0 and 8760),
  randomize_questions boolean not null default true,
  opens_at timestamptz,
  closes_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  focus_area_id uuid not null references public.focus_areas(id),
  question_text text not null,
  scenario_context text,
  explanation text,
  difficulty integer not null default 2 check (difficulty between 1 and 5),
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  judgment_weight numeric(5,2) not null default 0,
  display_order integer not null default 0,
  unique(question_id, display_order)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id),
  status public.attempt_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  scored_at timestamptz,
  expires_at timestamptz not null,
  raw_score numeric(7,2),
  percentage numeric(5,2) check (percentage between 0 and 100),
  percentile numeric(5,2) check (percentile between 0 and 100),
  capability_scores jsonb not null default '{}'::jsonb,
  duration_seconds integer check (duration_seconds >= 0),
  created_at timestamptz not null default now()
);

create table public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  selected_option_id uuid references public.question_options(id),
  answered_at timestamptz not null default now(),
  awarded_score numeric(7,2),
  unique(attempt_id, question_id)
);

create table public.certificate_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  title text not null,
  body_text text not null,
  authority_name text,
  signature_url text,
  background_url text,
  is_active boolean not null default false,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.quiz_attempts(id),
  participant_id uuid not null references public.profiles(id),
  quiz_id uuid not null references public.quizzes(id),
  level public.certificate_level not null,
  participant_name text not null,
  quiz_title text not null,
  score numeric(5,2) not null check (score between 0 and 100),
  verification_code text not null unique default upper(encode(gen_random_bytes(8),'hex')),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revocation_reason text,
  pdf_url text
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index questions_quiz_idx on public.questions(quiz_id);
create index attempts_participant_idx on public.quiz_attempts(participant_id, created_at desc);
create index attempts_quiz_idx on public.quiz_attempts(quiz_id, created_at desc);
create index certificates_verification_idx on public.certificates(verification_code);
create index audit_created_idx on public.audit_logs(created_at desc);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;
create or replace function public.can_manage_content() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','editor'))
$$;
create or replace function public.can_review_results() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','reviewer'))
$$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,email,full_name) values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create or replace function public.verify_certificate(code text)
returns table(participant_name text, quiz_title text, score numeric, level public.certificate_level, issued_at timestamptz, is_valid boolean)
language sql stable security definer set search_path = public as $$
  select c.participant_name,c.quiz_title,c.score,c.level,c.issued_at,(c.revoked_at is null)
  from public.certificates c where c.verification_code = upper(trim(code)) limit 1
$$;

alter table public.profiles enable row level security;
alter table public.focus_areas enable row level security;
alter table public.site_settings enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.certificate_templates enable row level security;
alter table public.certificates enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles own read" on public.profiles for select to authenticated using (id = auth.uid() or public.can_review_results());
create policy "profiles own update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "admins manage profiles" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public reads active focus areas" on public.focus_areas for select to anon,authenticated using (is_active);
create policy "content managers manage focus areas" on public.focus_areas for all to authenticated using (public.can_manage_content()) with check (public.can_manage_content());
create policy "public reads site settings" on public.site_settings for select to anon,authenticated using (true);
create policy "admins manage site settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public reads published quizzes" on public.quizzes for select to anon,authenticated using (status = 'published');
create policy "content managers manage quizzes" on public.quizzes for all to authenticated using (public.can_manage_content()) with check (public.can_manage_content());
create policy "content managers manage questions" on public.questions for all to authenticated using (public.can_manage_content()) with check (public.can_manage_content());
create policy "content managers manage options" on public.question_options for all to authenticated using (public.can_manage_content()) with check (public.can_manage_content());
create policy "participants read own attempts" on public.quiz_attempts for select to authenticated using (participant_id = auth.uid() or public.can_review_results());
create policy "participants create own attempts" on public.quiz_attempts for insert to authenticated with check (participant_id = auth.uid());
create policy "reviewers manage attempts" on public.quiz_attempts for all to authenticated using (public.can_review_results()) with check (public.can_review_results());
create policy "participants read own answers" on public.attempt_answers for select to authenticated using (exists(select 1 from public.quiz_attempts a where a.id = attempt_id and (a.participant_id = auth.uid() or public.can_review_results())));
create policy "participants create own answers" on public.attempt_answers for insert to authenticated with check (exists(select 1 from public.quiz_attempts a where a.id = attempt_id and a.participant_id = auth.uid() and a.status = 'in_progress'));
create policy "reviewers manage answers" on public.attempt_answers for all to authenticated using (public.can_review_results()) with check (public.can_review_results());
create policy "admins manage certificate templates" on public.certificate_templates for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "participants read own certificates" on public.certificates for select to authenticated using (participant_id = auth.uid() or public.can_review_results());
create policy "reviewers manage certificates" on public.certificates for all to authenticated using (public.can_review_results()) with check (public.can_review_results());
create policy "admins read audit logs" on public.audit_logs for select to authenticated using (public.is_admin());
create policy "authenticated create audit logs" on public.audit_logs for insert to authenticated with check (actor_id = auth.uid());
grant execute on function public.verify_certificate(text) to anon, authenticated;

insert into public.focus_areas(slug,title,description,display_order) values
('critical-thinking','Critical Thinking and Sound Judgment','Question assumptions, interpret evidence, and make sound judgments.',1),
('ethical-decision-making','Ethical Decision-Making','Choose actions grounded in integrity and responsibility.',2),
('creativity-foresight','Creativity and Foresight','Imagine possibilities, anticipate change, and turn ideas into action.',3),
('empathy-leadership','Empathy, Leadership, and Collaboration','Understand perspectives, build trust, and move teams forward.',4),
('global-citizenship','Global Citizenship','Connect local choices to global consequences.',5),
('sustainable-problem-solving','Sustainability and Responsible Problem-Solving','Design solutions that serve people and planet over time.',6);
insert into public.site_settings(singleton) values(true);
insert into public.certificate_templates(name,title,body_text,authority_name,is_active)
values('Future Mind Global Standard','Certificate of Achievement','This certifies that {{participant_name}} completed {{quiz_title}} with a score of {{score}}%.','Future Mind Global',true);
