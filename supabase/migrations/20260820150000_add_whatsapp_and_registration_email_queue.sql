alter table public.registration_interests add column if not exists whatsapp_number text;
alter table public.participants add column if not exists whatsapp_number text;
alter table public.organizations add column if not exists whatsapp_number text;

alter table public.registration_interests
  add constraint registration_interests_whatsapp_format check (whatsapp_number is null or whatsapp_number ~ '^\+[1-9][0-9]{7,14}$') not valid;
alter table public.participants
  add constraint participants_whatsapp_format check (whatsapp_number is null or whatsapp_number ~ '^\+[1-9][0-9]{7,14}$') not valid;
alter table public.organizations
  add constraint organizations_whatsapp_format check (whatsapp_number is null or whatsapp_number ~ '^\+[1-9][0-9]{7,14}$') not valid;

create table if not exists public.registration_email_queue (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null check (position('@' in recipient_email) > 1),
  recipient_name text not null default '',
  template_key text not null check (template_key in ('interest_confirmation','registration_confirmation','event_reminder')),
  registration_interest_id uuid references public.registration_interests(id) on delete cascade,
  competition_registration_id uuid references public.competition_registrations(id) on delete cascade,
  scheduled_for timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','cancelled')),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists registration_email_queue_pending_idx
  on public.registration_email_queue(status, scheduled_for)
  where status = 'pending';

alter table public.registration_email_queue enable row level security;
revoke all on public.registration_email_queue from anon, authenticated;
grant select, insert, update, delete on public.registration_email_queue to authenticated;
create policy "admins manage registration email queue"
  on public.registration_email_queue for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create or replace function public.queue_interest_confirmation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.registration_email_queue(recipient_email, recipient_name, template_key, registration_interest_id)
  values (new.email, new.contact_name, 'interest_confirmation', new.id);
  return new;
end;
$$;
revoke all on function public.queue_interest_confirmation() from public, anon, authenticated;

drop trigger if exists queue_interest_confirmation_after_insert on public.registration_interests;
create trigger queue_interest_confirmation_after_insert
after insert on public.registration_interests for each row execute function public.queue_interest_confirmation();

create or replace function public.queue_registration_confirmation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_email text; v_name text;
begin
  if new.registration_type = 'individual' then
    select guardian_email, coalesce(guardian_name, full_name) into v_email, v_name
    from public.participants where id = new.participant_id;
  else
    select email, contact_name into v_email, v_name
    from public.organizations where id = new.organization_id;
  end if;
  if v_email is not null then
    insert into public.registration_email_queue(recipient_email, recipient_name, template_key, competition_registration_id)
    values (v_email, coalesce(v_name, ''), 'registration_confirmation', new.id);
  end if;
  return new;
end;
$$;
revoke all on function public.queue_registration_confirmation() from public, anon, authenticated;

drop trigger if exists queue_registration_confirmation_after_insert on public.competition_registrations;
create trigger queue_registration_confirmation_after_insert
after insert on public.competition_registrations for each row execute function public.queue_registration_confirmation();

comment on table public.registration_email_queue is
  'Transactional email outbox. Delivery remains provider-neutral and should be processed by a secured Edge Function after an email provider secret is configured.';
