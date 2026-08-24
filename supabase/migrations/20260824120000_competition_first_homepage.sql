update public.page_sections
set content = content || jsonb_build_object(
  'eyebrow', 'International annual competition · Ages 8–18',
  'title', 'Global Future Skills Challenge 2026.',
  'accent_title', 'How will you think?',
  'description', 'An international annual competition where young people solve real-world scenarios, discover their strengths and earn globally verifiable recognition.',
  'primary_button', 'Register for the competition',
  'secondary_button', 'Try a Challenge · 2 minutes',
  'proof_title', 'Inaugural international competition',
  'proof_text', 'November 2026 · Five age levels · Open worldwide',
  'card_label', 'GLOBAL CHALLENGE 2026',
  'card_title', 'Participate. Discover. Improve. Return stronger.'
), display_order = 1
where page_path = '/' and section_key = 'top';

insert into public.page_sections(page_path, section_key, display_name, display_order, is_visible, content)
select '/', 'competition_overview', 'Competition Overview', 2, true, jsonb_build_object(
  'button', 'Try 3 sample questions',
  'facts', jsonb_build_array(
    jsonb_build_object('label','Who','value','Young people aged 8–18'),
    jsonb_build_object('label','What','value','International annual challenge'),
    jsonb_build_object('label','When','value','November 2026'),
    jsonb_build_object('label','Outcome','value','Profile, certificate and ranking')
  )
)
where not exists (
  select 1 from public.page_sections where page_path = '/' and section_key = 'competition_overview'
);

update public.page_sections
set display_order = 2,
    is_visible = true,
    content = jsonb_build_object(
      'button', 'Try 3 sample questions',
      'facts', jsonb_build_array(
        jsonb_build_object('label','Who','value','Young people aged 8–18'),
        jsonb_build_object('label','What','value','International annual challenge'),
        jsonb_build_object('label','When','value','November 2026'),
        jsonb_build_object('label','Outcome','value','Profile, certificate and ranking')
      )
    )
where page_path = '/' and section_key = 'competition_overview';

update public.page_sections set display_order = 3 where page_path = '/' and section_key = 'challenge';
update public.page_sections set display_order = 4 where page_path = '/' and section_key = 'statement';
update public.page_sections
set display_order = 5,
    content = content || jsonb_build_object(
      'title', 'Grow every year.',
      'accent_title', 'Progress with purpose.',
      'eyebrow', 'Five levels. One annual journey.',
      'description', 'Students return annually, receive a new Future Mind result and progress through levels designed for their developmental stage.',
      'journey', jsonb_build_array(
        jsonb_build_object('title','Participate','text','Take the annual challenge'),
        jsonb_build_object('title','Discover','text','Receive your strengths profile'),
        jsonb_build_object('title','Improve','text','Build the capabilities that matter'),
        jsonb_build_object('title','Return','text','Come back for the next annual challenge'),
        jsonb_build_object('title','Progress','text','Advance through the age levels')
      )
    )
where page_path = '/' and section_key = 'pathways';

update public.page_sections
set display_order = 6,
    content = content || jsonb_build_object(
      'eyebrow', 'What every student receives',
      'title', 'More than a score. A record of how you think.',
      'description', 'Every completed challenge produces a meaningful outcome students can understand, share and build on year after year.',
      'items', jsonb_build_array(
        jsonb_build_object('title','Future Mind profile & scores','text','See strengths and growth areas across the six capabilities.'),
        jsonb_build_object('title','Secure certificate','text','Receive a globally verifiable record of participation or achievement.'),
        jsonb_build_object('title','International ranking','text','Compare global, country and age-level performance when rankings are published.'),
        jsonb_build_object('title','Global Distinction','text','High performers can earn recognition for placing in the top 10% of their age level.')
      )
    )
where page_path = '/' and section_key = 'recognition';

update public.page_sections set display_order = 7 where page_path = '/' and section_key = 'skills';
update public.page_sections set display_order = 8 where page_path = '/' and section_key = 'verify';
update public.page_sections set display_order = 9 where page_path = '/' and section_key = 'cta';
update public.page_sections set display_order = 10 where page_path = '/' and section_key = 'footer';
