alter table public.popups
  add column if not exists youtube_url text,
  add column if not exists open_new_tab boolean not null default false;

alter table public.certificate_templates
  add column if not exists template_kind text not null default 'achievement'
    check (template_kind in ('participation','achievement','distinction')),
  add column if not exists design_settings jsonb not null default '{"orientation":"landscape","primary_color":"#071a34","accent_color":"#18d4df","text_color":"#10223b","font_family":"Georgia","alignment":"center","show_logo":true,"show_qr":true,"show_score":true,"show_date":true,"border_style":"double"}'::jsonb;

create table if not exists public.certificate_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.certificate_templates(id) on delete cascade,
  label text not null,
  snapshot jsonb not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists certificate_template_versions_template_idx
  on public.certificate_template_versions(template_id, created_at desc);
create index if not exists certificate_template_versions_created_by_idx
  on public.certificate_template_versions(created_by);

alter table public.certificate_template_versions enable row level security;
grant select, insert on public.certificate_template_versions to authenticated;

create policy "admins read certificate template versions"
  on public.certificate_template_versions for select to authenticated
  using ((select public.is_admin()));

create policy "admins create certificate template versions"
  on public.certificate_template_versions for insert to authenticated
  with check ((select public.is_admin()) and created_by = (select auth.uid()));

update public.page_sections set content = case section_key
  when 'top' then '{"eyebrow":"A global platform for young minds","title":"Think beyond borders.","accent_title":"Lead what comes next.","description":"Build the human capabilities that shape the future—then put them to the test in a global challenge designed for thoughtful young leaders.","primary_button":"Experience the challenge","secondary_button":"Explore the six skills","proof_title":"Built for curious minds everywhere","proof_text":"Learning • Assessment • Recognition","card_label":"THE 2026 CHALLENGE","card_title":"One world. Six human capabilities."}'::jsonb
  when 'statement' then '{"eyebrow":"Beyond grades. Beyond memorization.","title":"The future belongs to people who can think clearly, choose wisely, and act together."}'::jsonb
  when 'skills' then '{"eyebrow":"The Future Mind Framework","title":"Six capabilities. One complete mind.","description":"Our framework focuses on the human strengths that traditional examinations rarely measure—but tomorrow’s world will demand.","items":[{"number":"01","title":"Critical Thinking","text":"Question assumptions, interpret evidence, and make sound judgments in uncertain situations."},{"number":"02","title":"Ethical Decision-Making","text":"Balance competing interests and choose actions grounded in integrity and responsibility."},{"number":"03","title":"Creativity & Foresight","text":"Imagine better possibilities, anticipate change, and turn original ideas into action."},{"number":"04","title":"Empathy & Leadership","text":"Understand different perspectives, build trust, and help teams move forward together."},{"number":"05","title":"Global Citizenship","text":"Connect local choices to global consequences and engage respectfully across cultures."},{"number":"06","title":"Sustainable Problem-Solving","text":"Design practical solutions that serve people, communities, and the planet over time."}]}'::jsonb
  when 'pathways' then '{"eyebrow":"Learning that grows with you","title":"One journey.","accent_title":"Three stages.","description":"Age-appropriate pathways turn big ideas into practical habits—from first questions to confident global judgment.","items":[{"label":"Explorer","ages":"Ages 10–12","kicker":"Build the foundations","title":"Curiosity becomes confident thinking.","text":"Short stories, visual scenarios, and guided reflection introduce the habits behind thoughtful choices.","features":"6 guided modules|20-minute challenge|Participation certificate"},{"label":"Pioneer","ages":"Ages 13–15","kicker":"Navigate real choices","title":"Ideas meet real-world complexity.","text":"Students examine competing perspectives, collaborate on dilemmas, and learn to explain the reasoning behind their decisions.","features":"8 interactive modules|30-minute challenge|Achievement certificate"},{"label":"Global Leader","ages":"Ages 16–18","kicker":"Prepare for what comes next","title":"Judgment becomes a visible strength.","text":"Advanced global scenarios assess the capabilities that matter in higher education, work, and responsible leadership.","features":"10 advanced modules|45-minute challenge|Global distinction eligibility"}]}'::jsonb
  when 'challenge' then '{"eyebrow":"The Global Future Skills Challenge","title":"Not what you know.","accent_title":"How you think.","description":"Step into realistic dilemmas without obvious answers. We assess the reasoning behind your choices across all six capabilities.","features":[{"title":"Scenario-based","text":"Choices drawn from real global challenges"},{"title":"Personal strengths profile","text":"Understand how you think and where to grow"},{"title":"Globally verifiable","text":"Recognition backed by a unique credential"}],"button":"Try a sample scenario","scenario_category":"ETHICAL DECISION-MAKING","scenario_question":"Your team discovers its strongest result is based on incomplete data—two days before the final presentation.","scenario_prompt":"What is the most responsible next step?","scenario_button":"Open scenario"}'::jsonb
  when 'recognition' then '{"eyebrow":"Recognition with meaning","title":"Make your strengths visible to the world.","description":"Every participant receives meaningful feedback. High-performing students earn secure, verifiable recognition they can add to academic applications and personal portfolios.","items":[{"title":"Participation","text":"Complete the full global assessment."},{"title":"Achievement","text":"Meet the international competency standard."},{"title":"Global Distinction","text":"Place in the top 10% of your age group."}]}'::jsonb
  when 'verify' then '{"eyebrow":"Trust built in","title":"Every achievement. Instantly verifiable.","label":"Enter a certificate ID","button":"Verify credential","hint":"Enter a credential to check its validity."}'::jsonb
  when 'cta' then '{"eyebrow":"The future is already asking","title":"How will you answer?","description":"Be among the first to experience the Global Future Skills Challenge.","placeholder":"Your email address","button":"Get early access"}'::jsonb
  else content end
where page_path = '/';
