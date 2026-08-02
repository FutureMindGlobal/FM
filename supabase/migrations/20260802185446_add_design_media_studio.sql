create type public.media_kind as enum ('image','video','audio','animation');
create type public.popup_audience as enum ('everyone','visitors','students','staff');
create type public.popup_frequency as enum ('every_visit','once_session','once_day');

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind public.media_kind not null,
  bucket text not null check (bucket in ('site-media','exam-media')),
  storage_path text not null,
  public_url text,
  mime_type text not null,
  size_bytes bigint not null default 0 check (size_bytes >= 0 and size_bytes <= 52428800),
  alt_text text,
  caption text,
  transcript text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique(bucket, storage_path)
);

create table public.question_media (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  display_order integer not null default 0,
  require_playback boolean not null default false,
  allow_replay boolean not null default true,
  show_controls boolean not null default true,
  unique(question_id, media_asset_id)
);

alter table public.question_options add column media_asset_id uuid references public.media_assets(id) on delete set null;

create table public.site_theme (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  theme_name text not null default 'Midnight Cyan',
  primary_color text not null default '#061329',
  secondary_color text not null default '#091d3d',
  accent_color text not null default '#18d9e5',
  background_color text not null default '#f4f2ec',
  surface_color text not null default '#ffffff',
  text_color text not null default '#0b1b33',
  muted_text_color text not null default '#718096',
  menu_text_color text not null default '#c7d4e7',
  heading_font text not null default 'Georgia',
  body_font text not null default 'Geist',
  base_font_size integer not null default 16 check (base_font_size between 14 and 20),
  heading_scale numeric(3,2) not null default 1.60 check (heading_scale between 1.20 and 2.20),
  line_height numeric(3,2) not null default 1.60 check (line_height between 1.20 and 2.00),
  letter_spacing numeric(4,2) not null default 0 check (letter_spacing between -0.05 and 0.20),
  content_width integer not null default 1200 check (content_width between 900 and 1600),
  section_spacing integer not null default 110 check (section_spacing between 48 and 180),
  button_radius integer not null default 2 check (button_radius between 0 and 40),
  card_radius integer not null default 0 check (card_radius between 0 and 40),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  href text not null,
  location text not null default 'header' check (location in ('header','footer')),
  display_order integer not null default 0,
  is_active boolean not null default true,
  open_new_tab boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.footer_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  description text not null default 'Developing the human capabilities that shape a better future.',
  badge_text text not null default 'GLOBAL • INCLUSIVE • FUTURE-READY',
  copyright_text text not null default '© 2026 Future Mind Global. All rights reserved.',
  contact_email text,
  social_links jsonb not null default '{}'::jsonb,
  is_visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.page_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  display_name text not null,
  page_path text not null default '/',
  display_order integer not null default 0,
  is_visible boolean not null default true,
  background_color text,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.popups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body_text text,
  media_asset_id uuid references public.media_assets(id) on delete set null,
  button_text text,
  button_url text,
  status public.content_status not null default 'draft',
  audience public.popup_audience not null default 'everyone',
  pages text[] not null default array['/']::text[],
  starts_at timestamptz,
  ends_at timestamptz,
  frequency public.popup_frequency not null default 'once_session',
  delay_seconds integer not null default 2 check (delay_seconds between 0 and 60),
  position text not null default 'center' check (position in ('center','bottom_right','bottom_banner')),
  allow_close boolean not null default true,
  is_mobile_enabled boolean not null default true,
  is_desktop_enabled boolean not null default true,
  priority integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.design_versions (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  snapshot jsonb not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index media_assets_kind_idx on public.media_assets(kind, archived_at);
create index question_media_question_idx on public.question_media(question_id, display_order);
create index popups_schedule_idx on public.popups(status, starts_at, ends_at, priority desc);
create index navigation_location_idx on public.navigation_items(location, display_order);
create index page_sections_order_idx on public.page_sections(page_path, display_order);

alter table public.media_assets enable row level security;
alter table public.question_media enable row level security;
alter table public.site_theme enable row level security;
alter table public.navigation_items enable row level security;
alter table public.footer_settings enable row level security;
alter table public.page_sections enable row level security;
alter table public.popups enable row level security;
alter table public.design_versions enable row level security;

grant select,insert,update,delete on public.media_assets, public.question_media, public.site_theme, public.navigation_items, public.footer_settings, public.page_sections, public.popups, public.design_versions to authenticated;
grant select on public.media_assets, public.site_theme, public.navigation_items, public.footer_settings, public.page_sections, public.popups to anon;

create policy "public reads public media metadata" on public.media_assets for select to anon using (bucket = 'site-media' and archived_at is null);
create policy "authenticated reads media metadata" on public.media_assets for select to authenticated using (archived_at is null);
create policy "content managers manage media metadata" on public.media_assets for all to authenticated using ((select public.can_manage_content())) with check ((select public.can_manage_content()));
create policy "content managers manage question media" on public.question_media for all to authenticated using ((select public.can_manage_content())) with check ((select public.can_manage_content()));

create policy "public reads site theme" on public.site_theme for select to anon,authenticated using (true);
create policy "admins manage site theme" on public.site_theme for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "public reads active navigation" on public.navigation_items for select to anon,authenticated using (is_active);
create policy "admins manage navigation" on public.navigation_items for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "public reads footer" on public.footer_settings for select to anon,authenticated using (is_visible);
create policy "admins manage footer" on public.footer_settings for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "public reads visible sections" on public.page_sections for select to anon,authenticated using (is_visible);
create policy "admins manage page sections" on public.page_sections for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "public reads active popups" on public.popups for select to anon,authenticated using (status = 'published' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()));
create policy "admins manage popups" on public.popups for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins manage design versions" on public.design_versions for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('site-media','site-media',true,52428800,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/wav','audio/ogg']),
('exam-media','exam-media',false,52428800,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/wav','audio/ogg'])
on conflict (id) do update set file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

create policy "content managers upload media" on storage.objects for insert to authenticated with check (bucket_id in ('site-media','exam-media') and (select public.can_manage_content()));
create policy "content managers update media" on storage.objects for update to authenticated using (bucket_id in ('site-media','exam-media') and (select public.can_manage_content())) with check (bucket_id in ('site-media','exam-media') and (select public.can_manage_content()));
create policy "content managers delete media" on storage.objects for delete to authenticated using (bucket_id in ('site-media','exam-media') and (select public.can_manage_content()));
create policy "content managers read all media" on storage.objects for select to authenticated using (bucket_id in ('site-media','exam-media') and (select public.can_manage_content()));
create policy "students read active attempt media" on storage.objects for select to authenticated using (
  bucket_id = 'exam-media' and exists (
    select 1
    from public.media_assets ma
    join public.question_media qm on qm.media_asset_id = ma.id
    join public.questions q on q.id = qm.question_id
    join public.exam_question_groups eg on eg.group_id = q.group_id
    join public.quiz_attempts a on a.quiz_id = eg.quiz_id
    where ma.bucket = 'exam-media' and ma.storage_path = storage.objects.name
      and a.participant_id = (select auth.uid()) and a.status = 'in_progress' and a.expires_at > now()
  )
);

insert into public.site_theme(singleton) values(true);
insert into public.footer_settings(singleton) values(true);
insert into public.navigation_items(label,href,location,display_order) values
('Future Skills','#skills','header',1),('Learning','#pathways','header',2),('Global Challenge','#challenge','header',3),('Recognition','#recognition','header',4),('Verify','#verify','header',5),('Student Login','/exams','header',6);
insert into public.page_sections(section_key,display_name,display_order) values
('top','Hero',1),('statement','Mission Statement',2),('skills','Future Skills',3),('pathways','Learning Pathways',4),('challenge','Global Challenge',5),('recognition','Recognition',6),('verify','Certificate Verification',7),('cta','Call to Action',8),('footer','Footer',9);

drop function if exists public.get_exam_questions(uuid);
create function public.get_exam_questions(attempt_uuid uuid)
returns table(question_id uuid, question_text text, scenario_context text, display_order integer, options jsonb, media jsonb)
language sql stable security definer set search_path = '' as $$
  select q.id, q.question_text, q.scenario_context, q.display_order,
    coalesce(jsonb_agg(distinct jsonb_build_object('id',o.id,'text',o.option_text,'order',o.display_order,'media_asset_id',o.media_asset_id)) filter (where o.id is not null), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('id',ma.id,'kind',ma.kind,'bucket',ma.bucket,'path',ma.storage_path,'url',ma.public_url,'alt',ma.alt_text,'caption',ma.caption,'transcript',ma.transcript,'require_playback',qm.require_playback,'allow_replay',qm.allow_replay,'show_controls',qm.show_controls) order by qm.display_order) from public.question_media qm join public.media_assets ma on ma.id=qm.media_asset_id where qm.question_id=q.id), '[]'::jsonb)
  from public.quiz_attempts a join public.exam_question_groups eg on eg.quiz_id=a.quiz_id join public.questions q on q.group_id=eg.group_id and q.is_active left join public.question_options o on o.question_id=q.id
  where a.id=attempt_uuid and a.participant_id=(select auth.uid()) and a.status='in_progress' and a.expires_at>now()
  group by q.id,q.question_text,q.scenario_context,q.display_order order by q.display_order;
$$;
revoke execute on function public.get_exam_questions(uuid) from public,anon;
grant execute on function public.get_exam_questions(uuid) to authenticated;

create function public.get_public_page_layout(requested_path text default '/')
returns table(section_key text, display_order integer, is_visible boolean, background_color text, title_override text)
language sql stable security definer set search_path = '' as $$
  select ps.section_key, ps.display_order, ps.is_visible, ps.background_color,
    case when ps.is_visible then ps.content->>'title' else null end
  from public.page_sections ps where ps.page_path=requested_path order by ps.display_order;
$$;
revoke execute on function public.get_public_page_layout(text) from public;
grant execute on function public.get_public_page_layout(text) to anon,authenticated;
