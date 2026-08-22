create table public.registration_email_claims (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  normalized_email text not null,
  account_id uuid not null references public.profiles(id) on delete cascade,
  registration_type text not null check (registration_type in ('individual','school')),
  participant_id uuid references public.participants(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (competition_id, normalized_email),
  check (normalized_email = lower(btrim(normalized_email)) and position('@' in normalized_email) > 1)
);

comment on table public.registration_email_claims is
  'Prevents future duplicate registrations by reserving one normalized contact email per competition. Existing registration rows are not modified.';

insert into public.registration_email_claims (
  competition_id, normalized_email, account_id, registration_type, participant_id, organization_id, created_at
)
select distinct on (r.competition_id, source.normalized_email)
  r.competition_id,
  source.normalized_email,
  source.account_id,
  r.registration_type,
  r.participant_id,
  r.organization_id,
  r.created_at
from public.competition_registrations r
cross join lateral (
  select
    lower(btrim(case when r.registration_type = 'individual' then p.guardian_email else o.email end)) as normalized_email,
    case when r.registration_type = 'individual' then p.account_id else o.owner_id end as account_id
  from (select 1) seed
  left join public.participants p on p.id = r.participant_id
  left join public.organizations o on o.id = r.organization_id
) source
where source.normalized_email is not null
  and position('@' in source.normalized_email) > 1
order by r.competition_id, source.normalized_email, r.created_at, r.id;

alter table public.registration_email_claims enable row level security;
revoke all on public.registration_email_claims from anon, authenticated;
grant select on public.registration_email_claims to authenticated;
create policy "accounts read own registration email claims"
  on public.registration_email_claims for select to authenticated
  using (account_id = (select auth.uid()) or (select public.is_admin()));

create or replace function public.submit_individual_competition_registration(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid := auth.uid();
  v_competition_id uuid := (payload->>'competition_id')::uuid;
  v_email text := lower(btrim(payload->>'guardian_email'));
  v_participant_id uuid;
  v_registration_id uuid;
begin
  if v_account_id is null then raise exception using errcode = '42501', message = 'LOGIN_REQUIRED'; end if;
  if v_email is null or position('@' in v_email) <= 1 then raise exception using errcode = '22023', message = 'VALID_EMAIL_REQUIRED'; end if;
  if not exists (select 1 from public.competitions where id = v_competition_id and registration_enabled) then
    raise exception using errcode = '22023', message = 'REGISTRATION_NOT_AVAILABLE';
  end if;

  begin
    insert into public.registration_email_claims(competition_id, normalized_email, account_id, registration_type)
    values (v_competition_id, v_email, v_account_id, 'individual');
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'REGISTRATION_EMAIL_ALREADY_USED';
  end;

  insert into public.participants (
    account_id, full_name, date_of_birth, country_code, city, school_name,
    guardian_name, guardian_email, guardian_phone, whatsapp_number, level_id
  ) values (
    v_account_id, btrim(payload->>'full_name'), (payload->>'date_of_birth')::date,
    nullif(payload->>'country_code',''), nullif(btrim(payload->>'city'),''), nullif(btrim(payload->>'school_name'),''),
    nullif(btrim(payload->>'guardian_name'),''), v_email, nullif(btrim(payload->>'guardian_phone'),''),
    payload->>'whatsapp_number', (payload->>'level_id')::uuid
  ) returning id into v_participant_id;

  insert into public.consent_records(participant_id, account_id, consent_type, consent_version, granted)
  values
    (v_participant_id, v_account_id, 'guardian', '2026.1', coalesce((payload->>'consent')::boolean, false)),
    (v_participant_id, v_account_id, 'privacy', '2026.1', coalesce((payload->>'consent')::boolean, false));

  insert into public.competition_registrations (
    competition_id, participant_id, registration_type, level_id, amount_minor,
    currency_code, price_label, checkout_url, payment_status, consent_complete
  ) values (
    v_competition_id, v_participant_id, 'individual', (payload->>'level_id')::uuid,
    coalesce((payload->>'amount_minor')::integer, 0), nullif(payload->>'currency_code',''),
    nullif(payload->>'price_label',''), nullif(payload->>'checkout_url',''),
    case when coalesce((payload->>'amount_minor')::integer, 0) > 0 then 'pending' else 'not_required' end,
    coalesce((payload->>'consent')::boolean, false)
  ) returning id into v_registration_id;

  update public.registration_email_claims
  set participant_id = v_participant_id
  where competition_id = v_competition_id and normalized_email = v_email;

  return jsonb_build_object('registration_id', v_registration_id, 'participant_id', v_participant_id);
end;
$$;

create or replace function public.submit_school_competition_registration(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid := auth.uid();
  v_competition_id uuid := (payload->>'competition_id')::uuid;
  v_email text := lower(btrim(payload->>'email'));
  v_organization_id uuid;
  v_registration_id uuid;
  v_unit_amount integer := coalesce((payload->>'amount_minor')::integer, 0);
  v_quantity integer := coalesce((payload->>'expected_students')::integer, 1);
begin
  if v_account_id is null then raise exception using errcode = '42501', message = 'LOGIN_REQUIRED'; end if;
  if v_email is null or position('@' in v_email) <= 1 then raise exception using errcode = '22023', message = 'VALID_EMAIL_REQUIRED'; end if;
  if not exists (select 1 from public.competitions where id = v_competition_id and registration_enabled) then
    raise exception using errcode = '22023', message = 'REGISTRATION_NOT_AVAILABLE';
  end if;

  begin
    insert into public.registration_email_claims(competition_id, normalized_email, account_id, registration_type)
    values (v_competition_id, v_email, v_account_id, 'school');
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'REGISTRATION_EMAIL_ALREADY_USED';
  end;

  insert into public.organizations (
    owner_id, name, country_code, city, contact_name, email, phone, whatsapp_number, expected_students
  ) values (
    v_account_id, btrim(payload->>'name'), nullif(payload->>'country_code',''),
    nullif(btrim(payload->>'city'),''), btrim(payload->>'contact_name'), v_email,
    nullif(btrim(payload->>'phone'),''), payload->>'whatsapp_number', v_quantity
  ) returning id into v_organization_id;

  insert into public.competition_registrations (
    competition_id, organization_id, registration_type, amount_minor, currency_code,
    price_label, checkout_url, payment_status, consent_complete
  ) values (
    v_competition_id, v_organization_id, 'school', v_unit_amount * v_quantity,
    nullif(payload->>'currency_code',''), nullif(payload->>'price_label',''),
    nullif(payload->>'checkout_url',''), case when v_unit_amount > 0 then 'pending' else 'invoiced' end, false
  ) returning id into v_registration_id;

  update public.registration_email_claims
  set organization_id = v_organization_id
  where competition_id = v_competition_id and normalized_email = v_email;

  return jsonb_build_object('registration_id', v_registration_id, 'organization_id', v_organization_id);
end;
$$;

revoke all on function public.submit_individual_competition_registration(jsonb) from public, anon;
revoke all on function public.submit_school_competition_registration(jsonb) from public, anon;
grant execute on function public.submit_individual_competition_registration(jsonb) to authenticated;
grant execute on function public.submit_school_competition_registration(jsonb) to authenticated;
