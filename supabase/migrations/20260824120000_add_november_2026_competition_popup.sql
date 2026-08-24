-- Managed homepage announcement for the November 2026 competition.
-- The matching image is deployed from /public and may also be managed in Website Studio.

insert into public.media_assets (
  name,
  kind,
  bucket,
  storage_path,
  public_url,
  mime_type,
  alt_text
)
select
  'Global Future Skills Challenge — November 2026',
  'image',
  'site-media',
  'website-assets/popup-global-future-skills-november-2026.png',
  'https://www.futuremindglobal.org/popup-global-future-skills-november-2026.png',
  'image/png',
  'Diverse young people collaborating around the Global Future Skills Challenge, November 2026'
where not exists (
  select 1
  from public.media_assets
  where public_url = 'https://www.futuremindglobal.org/popup-global-future-skills-november-2026.png'
);

insert into public.popups (
  title,
  body_text,
  media_asset_id,
  button_text,
  button_url,
  status,
  audience,
  pages,
  starts_at,
  ends_at,
  frequency,
  delay_seconds,
  position,
  allow_close,
  show_mobile,
  show_desktop,
  priority,
  open_new_tab
)
select
  'Global Future Skills Challenge',
  'An international annual competition for young people aged 8–18. More information is coming soon.',
  media.id,
  'Register interest',
  '/register',
  'published',
  'everyone',
  array['/']::text[],
  now(),
  '2026-11-30 23:59:59+03'::timestamptz,
  'once_day',
  2,
  'center',
  true,
  true,
  true,
  100,
  false
from public.media_assets media
where media.public_url = 'https://www.futuremindglobal.org/popup-global-future-skills-november-2026.png'
  and not exists (
    select 1
    from public.popups
    where title = 'Global Future Skills Challenge'
      and pages @> array['/']::text[]
  );
