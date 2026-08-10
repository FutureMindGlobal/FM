create table public.competition_levels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  min_age integer not null check (min_age between 5 and 25),
  max_age integer not null check (max_age between min_age and 25),
  description text not null default '',
  color text not null default '#18d4df',
  image_url text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  competition_year integer not null check (competition_year between 2025 and 2100),
  subtitle text not null default '',
  description text not null default '',
  status text not null default 'interest' check (status in ('draft','interest','registration','closed','exam','results','archived')),
  event_date date,
  eligibility_date date not null,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  exam_opens_at timestamptz,
  exam_closes_at timestamptz,
  results_publish_at timestamptz,
  interest_enabled boolean not null default true,
  registration_enabled boolean not null default false,
  individual_payment_enabled boolean not null default false,
  school_payment_enabled boolean not null default false,
  exam_enabled boolean not null default false,
  results_published boolean not null default false,
  rankings_published boolean not null default false,
  certificates_enabled boolean not null default false,
  certificate_requires_approval boolean not null default true,
  homepage_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pricing_tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.country_pricing (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null unique,
  country_name text not null,
  currency_code char(3) not null,
  tier_id uuid references public.pricing_tiers(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.competition_prices (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  country_code char(2),
  tier_id uuid references public.pricing_tiers(id) on delete cascade,
  registration_type text not null check (registration_type in ('individual','school')),
  min_quantity integer not null default 1 check (min_quantity > 0),
  max_quantity integer check (max_quantity is null or max_quantity >= min_quantity),
  amount_minor integer not null default 0 check (amount_minor >= 0),
  currency_code char(3) not null,
  checkout_url text,
  label text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (country_code is not null or tier_id is not null)
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  country_code char(2),
  city text,
  contact_name text not null,
  email text not null,
  phone text,
  expected_students integer not null default 1 check (expected_students > 0),
  status text not null default 'pending' check (status in ('pending','approved','suspended','archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  full_name text not null,
  date_of_birth date not null,
  country_code char(2),
  city text,
  school_name text,
  guardian_name text,
  guardian_email text,
  guardian_phone text,
  level_id uuid references public.competition_levels(id) on delete set null,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.registration_interests (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid references public.competitions(id) on delete set null,
  registration_type text not null check (registration_type in ('individual','school')),
  contact_name text not null,
  email text not null check (position('@' in email) > 1),
  country_code char(2),
  organization_name text,
  estimated_students integer,
  message text,
  status text not null default 'new' check (status in ('new','contacted','converted','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  account_id uuid not null references public.profiles(id) on delete cascade,
  consent_type text not null check (consent_type in ('guardian','school','privacy','terms','media')),
  consent_version text not null,
  granted boolean not null,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  ip_reference text,
  created_at timestamptz not null default now()
);

create table public.competition_registrations (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  participant_id uuid references public.participants(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  registration_type text not null check (registration_type in ('individual','school')),
  level_id uuid references public.competition_levels(id) on delete set null,
  status text not null default 'submitted' check (status in ('draft','submitted','approved','waitlisted','cancelled','completed')),
  amount_minor integer not null default 0,
  currency_code char(3),
  price_label text,
  checkout_url text,
  payment_status text not null default 'pending' check (payment_status in ('not_required','pending','paid','failed','refunded','waived','invoiced')),
  payment_reference text,
  consent_complete boolean not null default false,
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((registration_type = 'individual' and participant_id is not null) or (registration_type = 'school' and organization_id is not null))
);

create table public.annual_results (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  registration_id uuid references public.competition_registrations(id) on delete set null,
  level_id uuid references public.competition_levels(id) on delete set null,
  overall_score numeric(6,2) not null default 0 check (overall_score between 0 and 100),
  capability_scores jsonb not null default '{}'::jsonb,
  strengths_profile jsonb not null default '{}'::jsonb,
  performance_band text,
  global_rank integer,
  country_rank integer,
  level_rank integer,
  global_percentile numeric(6,2),
  recognition_level text not null default 'participation' check (recognition_level in ('participation','achievement','distinction')),
  status text not null default 'draft' check (status in ('draft','review','approved','published','withheld')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(competition_id, participant_id)
);

create table public.platform_configuration (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  label text not null,
  category text not null,
  value jsonb not null default '{}'::jsonb,
  description text not null default '',
  is_public boolean not null default false,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create index competition_levels_active_idx on public.competition_levels(is_active, display_order);
create index competitions_status_idx on public.competitions(status, competition_year desc);
create index country_pricing_tier_idx on public.country_pricing(tier_id, is_active);
create index competition_prices_lookup_idx on public.competition_prices(competition_id, registration_type, country_code, tier_id, min_quantity);
create index organizations_owner_idx on public.organizations(owner_id, status);
create index participants_account_idx on public.participants(account_id, status);
create index participants_org_idx on public.participants(organization_id);
create index interests_status_idx on public.registration_interests(status, created_at desc);
create index consent_participant_idx on public.consent_records(participant_id, consent_type);
create index consent_account_idx on public.consent_records(account_id);
create index registrations_participant_idx on public.competition_registrations(participant_id, competition_id);
create index registrations_org_idx on public.competition_registrations(organization_id, competition_id);
create index registrations_payment_idx on public.competition_registrations(payment_status, status);
create index registrations_approved_by_idx on public.competition_registrations(approved_by);
create index annual_results_participant_idx on public.annual_results(participant_id, competition_id);
create index annual_results_rank_idx on public.annual_results(competition_id, level_id, overall_score desc);
create index annual_results_approved_by_idx on public.annual_results(approved_by);
create index platform_configuration_updated_by_idx on public.platform_configuration(updated_by);

alter table public.competition_levels enable row level security;
alter table public.competitions enable row level security;
alter table public.pricing_tiers enable row level security;
alter table public.country_pricing enable row level security;
alter table public.competition_prices enable row level security;
alter table public.organizations enable row level security;
alter table public.participants enable row level security;
alter table public.registration_interests enable row level security;
alter table public.consent_records enable row level security;
alter table public.competition_registrations enable row level security;
alter table public.annual_results enable row level security;
alter table public.platform_configuration enable row level security;

grant select on public.competition_levels, public.competitions, public.pricing_tiers, public.country_pricing, public.competition_prices to anon, authenticated;
grant insert on public.registration_interests to anon, authenticated;
grant select, insert, update on public.organizations, public.participants, public.consent_records, public.competition_registrations to authenticated;
grant select on public.annual_results, public.platform_configuration to authenticated;
grant select, insert, update, delete on public.competition_levels, public.competitions, public.pricing_tiers, public.country_pricing, public.competition_prices, public.registration_interests, public.annual_results, public.platform_configuration to authenticated;

create policy "public reads active competition levels" on public.competition_levels for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "admins manage competition levels" on public.competition_levels for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "public reads visible competitions" on public.competitions for select to anon, authenticated using (homepage_enabled or (select public.is_admin()));
create policy "admins manage competitions" on public.competitions for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "public reads active pricing tiers" on public.pricing_tiers for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "admins manage pricing tiers" on public.pricing_tiers for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "public reads active country pricing" on public.country_pricing for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "admins manage country pricing" on public.country_pricing for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "public reads active competition prices" on public.competition_prices for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "admins manage competition prices" on public.competition_prices for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "owners read organizations" on public.organizations for select to authenticated using (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "owners create organizations" on public.organizations for insert to authenticated with check (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "owners update organizations" on public.organizations for update to authenticated using (owner_id = (select auth.uid()) or (select public.is_admin())) with check (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "admins delete organizations" on public.organizations for delete to authenticated using ((select public.is_admin()));

create policy "accounts read participants" on public.participants for select to authenticated using (account_id = (select auth.uid()) or exists(select 1 from public.organizations o where o.id = organization_id and o.owner_id = (select auth.uid())) or (select public.is_admin()));
create policy "accounts create participants" on public.participants for insert to authenticated with check (account_id = (select auth.uid()) or (select public.is_admin()));
create policy "accounts update participants" on public.participants for update to authenticated using (account_id = (select auth.uid()) or (select public.is_admin())) with check (account_id = (select auth.uid()) or (select public.is_admin()));
create policy "admins delete participants" on public.participants for delete to authenticated using ((select public.is_admin()));

create policy "anyone creates registration interest" on public.registration_interests for insert to anon, authenticated with check (status = 'new');
create policy "admins manage registration interests" on public.registration_interests for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "accounts read consent records" on public.consent_records for select to authenticated using (account_id = (select auth.uid()) or (select public.is_admin()));
create policy "accounts create consent records" on public.consent_records for insert to authenticated with check (account_id = (select auth.uid()) or (select public.is_admin()));
create policy "admins update consent records" on public.consent_records for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "accounts read registrations" on public.competition_registrations for select to authenticated using ((participant_id is not null and exists(select 1 from public.participants p where p.id = participant_id and p.account_id = (select auth.uid()))) or (organization_id is not null and exists(select 1 from public.organizations o where o.id = organization_id and o.owner_id = (select auth.uid()))) or (select public.is_admin()));
create policy "accounts create registrations" on public.competition_registrations for insert to authenticated with check ((participant_id is not null and exists(select 1 from public.participants p where p.id = participant_id and p.account_id = (select auth.uid()))) or (organization_id is not null and exists(select 1 from public.organizations o where o.id = organization_id and o.owner_id = (select auth.uid()))) or (select public.is_admin()));
create policy "accounts update draft registrations" on public.competition_registrations for update to authenticated using (((status = 'draft' or payment_status = 'pending') and ((participant_id is not null and exists(select 1 from public.participants p where p.id = participant_id and p.account_id = (select auth.uid()))) or (organization_id is not null and exists(select 1 from public.organizations o where o.id = organization_id and o.owner_id = (select auth.uid()))))) or (select public.is_admin())) with check ((participant_id is not null and exists(select 1 from public.participants p where p.id = participant_id and p.account_id = (select auth.uid()))) or (organization_id is not null and exists(select 1 from public.organizations o where o.id = organization_id and o.owner_id = (select auth.uid()))) or (select public.is_admin()));
create policy "admins delete registrations" on public.competition_registrations for delete to authenticated using ((select public.is_admin()));

create policy "participants read published annual results" on public.annual_results for select to authenticated using ((status = 'published' and exists(select 1 from public.participants p where p.id = participant_id and p.account_id = (select auth.uid()))) or (select public.is_admin()));
create policy "admins manage annual results" on public.annual_results for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "authenticated reads public platform settings" on public.platform_configuration for select to authenticated using (is_public or (select public.is_admin()));
create policy "admins manage platform settings" on public.platform_configuration for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

insert into public.competition_levels(name,slug,min_age,max_age,description,color,display_order) values
('Explorer','explorer',8,9,'Discover confident thinking through short, visual and age-appropriate scenarios.','#37d6c2',1),
('Discoverer','discoverer',10,11,'Build curiosity, reasoning and responsible decision-making.','#2bb5e8',2),
('Pioneer','pioneer',12,13,'Apply future skills to increasingly complex global situations.','#7f7cf2',3),
('Innovator','innovator',14,15,'Connect creativity, evidence and leadership to solve authentic challenges.','#ed9b4b',4),
('Global Leader','global-leader',16,18,'Demonstrate mature judgment across international and future-facing dilemmas.','#e56c91',5);

insert into public.competitions(name,slug,competition_year,subtitle,description,status,event_date,eligibility_date,interest_enabled,registration_enabled,homepage_enabled) values
('Global Future Skills Challenge 2026','global-future-skills-challenge-2026',2026,'Inaugural International Competition - November 2026','A global annual challenge for young people aged 8-18 to test critical thinking, creativity, ethical decision-making, leadership and future problem-solving.','interest','2026-11-21','2026-11-01',true,false,true);

insert into public.pricing_tiers(name,description,display_order) values
('Tier 1','Higher-income countries and markets',1),
('Tier 2','Middle-income countries and markets',2),
('Tier 3','More price-sensitive countries and markets',3);

insert into public.country_pricing(country_code,country_name,currency_code,tier_id)
select x.code,x.name,x.currency,t.id from (values
('US','United States','USD','Tier 1'),('GB','United Kingdom','GBP','Tier 1'),('CA','Canada','CAD','Tier 1'),('AU','Australia','AUD','Tier 1'),('AE','United Arab Emirates','AED','Tier 1'),('SA','Saudi Arabia','SAR','Tier 1'),
('MY','Malaysia','MYR','Tier 2'),('LK','Sri Lanka','LKR','Tier 2'),('IN','India','INR','Tier 3'),('PK','Pakistan','PKR','Tier 3'),('BD','Bangladesh','BDT','Tier 3'),('PH','Philippines','PHP','Tier 2'),('SG','Singapore','SGD','Tier 1'),('DE','Germany','EUR','Tier 1'),('FR','France','EUR','Tier 1'),('NL','Netherlands','EUR','Tier 1'),('ZA','South Africa','ZAR','Tier 2'),('NG','Nigeria','NGN','Tier 3'),('KE','Kenya','KES','Tier 3'),('JP','Japan','JPY','Tier 1')
) as x(code,name,currency,tier_name) join public.pricing_tiers t on t.name=x.tier_name;

insert into public.platform_configuration(setting_key,label,category,value,description,is_public) values
('registration_mode','Registration mode','Registration','{"mode":"interest"}','Controls whether visitors see interest, registration open or registration closed.',true),
('consent_version','Consent version','Privacy','{"version":"2026.1"}','Version recorded when guardians or schools grant consent.',false),
('ranking_method','Ranking method','Results','{"method":"score_then_time","minimum_participants":100}','Controls ranking calculation and minimum sample size.',false),
('stripe_mode','Stripe mode','Payments','{"mode":"disabled","publishable_key":""}','Stripe can remain disabled, test or live. Secret keys are never stored here.',false),
('data_retention','Data retention','Privacy','{"participant_years":7,"interest_months":24}','Editable retention periods for participant and interest records.',false);

update public.page_sections set content = jsonb_build_object(
  'eyebrow','Global Future Skills Challenge 2026',
  'title','Not what you know.',
  'accent_title','How you think.',
  'description','A global annual challenge for young people aged 8-18 to test critical thinking, creativity, ethical decision-making, leadership and the ability to solve future challenges.',
  'primary_button','Register Your Interest',
  'secondary_button','Try a Sample Challenge',
  'proof_title','Inaugural International Competition',
  'proof_text','November 2026 - Ages 8-18 - Five competition levels',
  'card_label','ANNUAL GLOBAL CHALLENGE',
  'card_title','Participate. Discover. Improve. Return stronger.'
) where section_key='top' and page_path='/';

update public.page_sections set content = jsonb_build_object(
  'eyebrow','Five levels. One annual journey.',
  'title','Grow every year.',
  'accent_title','Progress with purpose.',
  'description','Students can return annually, receive a new Future Mind result and progress through levels designed for their developmental stage.',
  'items',(select jsonb_agg(jsonb_build_object('label',name,'ages','Ages '||min_age||'-'||max_age,'kicker','Annual competition level','title',name||' Challenge','text',description,'features','Age-appropriate scenarios|Personal strengths profile|Verifiable recognition') order by display_order) from public.competition_levels)
) where section_key='pathways' and page_path='/';
