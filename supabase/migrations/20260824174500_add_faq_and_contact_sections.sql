insert into public.navigation_items(label, href, location, display_order, is_active)
select 'FAQ', '#faq', 'header', 7, true
where not exists (select 1 from public.navigation_items where location = 'header' and href = '#faq');

insert into public.navigation_items(label, href, location, display_order, is_active)
select 'Contact', '#contact', 'header', 8, true
where not exists (select 1 from public.navigation_items where location = 'header' and href = '#contact');

update public.footer_settings set contact_email = 'info@futuremindglobal.org';

insert into public.page_sections(page_path, section_key, display_name, display_order, is_visible, content)
select '/', 'faq', 'Frequently Asked Questions', 9, true, jsonb_build_object(
  'eyebrow', 'Questions, answered',
  'title', 'Frequently asked questions',
  'description', 'Everything students, parents and schools need to know before taking part.',
  'items', jsonb_build_array(
    jsonb_build_object('question','What is the Global Future Skills Challenge?','answer','It is an international annual competition where young people respond to realistic scenarios that assess six essential future capabilities.'),
    jsonb_build_object('question','Who can participate?','answer','Students aged 8–18 can participate in one of five age-appropriate levels. Individuals, parents, schools and organisations can register.'),
    jsonb_build_object('question','When is the next competition?','answer','The inaugural Global Future Skills Challenge is planned for November 2026. Confirmed dates and instructions will be shared with registered students.'),
    jsonb_build_object('question','What will students receive?','answer','Students can receive a personal Future Mind profile and score, an approved verifiable certificate, international recognition and Global Distinction eligibility for high performers.'),
    jsonb_build_object('question','Is the challenge available in English?','answer','Yes. The 2026 challenge will be delivered in English.'),
    jsonb_build_object('question','How will students access the challenge?','answer','Students register and sign in to their account. Available practice activities and scheduled competitions then appear in the student dashboard.')
  )
)
where not exists (select 1 from public.page_sections where page_path = '/' and section_key = 'faq');

insert into public.page_sections(page_path, section_key, display_name, display_order, is_visible, content)
select '/', 'contact', 'Contact', 10, true, jsonb_build_object(
  'eyebrow', 'Contact Future Mind Global',
  'title', 'We’re here to help.',
  'description', 'For questions about registration, schools, partnerships or the Global Future Skills Challenge, contact our team by email.',
  'email', 'info@futuremindglobal.org',
  'button', 'Email our team',
  'response_note', 'We aim to reply as soon as possible.'
)
where not exists (select 1 from public.page_sections where page_path = '/' and section_key = 'contact');

update public.page_sections set display_order = 11 where page_path = '/' and section_key = 'cta';
update public.page_sections set display_order = 12 where page_path = '/' and section_key = 'footer';
