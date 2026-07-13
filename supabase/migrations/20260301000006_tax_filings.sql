-- =============================================================================
-- MyJova — Migración: Tax filings tracking
-- =============================================================================
-- Registro de submissions e-filing por tenant — útil para auditar qué se
-- entregó a IRS/CRA/proveedor y poder reenviar si rechazaron.
-- =============================================================================

create type public.tax_filing_status as enum ('pending', 'submitted', 'accepted', 'rejected', 'failed');

create table public.tax_filings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tax_year        integer not null,
  form_type       text not null,  -- 'W-2', '1099-NEC', 'T4', 'T4A', 'ROE', '941', '940'
  jurisdiction    text not null,  -- 'US-FED', 'CA-FED', 'US-CA', etc
  provider        text,           -- 'track1099', 'irs_fire', 'cra', 'manual'
  status          public.tax_filing_status not null default 'pending',
  submitted_at    timestamptz,
  provider_ref    text,            -- submission ID from provider
  employee_ids    uuid[],          -- which employees were included
  total_amount_cents bigint,        -- total dollar amount on submission
  response_jsonb  jsonb,
  error_message   text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

create index idx_tax_filings_org_year on public.tax_filings(organization_id, tax_year desc);
create index idx_tax_filings_status on public.tax_filings(status);

alter table public.tax_filings enable row level security;

create policy "tax_filings_org_read" on public.tax_filings
  for select using (
    organization_id in (select public.user_org_ids())
    or public.is_platform_admin()
  );

create policy "tax_filings_org_insert" on public.tax_filings
  for insert with check (organization_id in (select public.user_org_ids()));

create policy "tax_filings_org_update" on public.tax_filings
  for update using (organization_id in (select public.user_org_ids()));

-- Trigger updated_at not needed — submissions are append-only conceptually

create table public.tax_calendar_events (
  id              uuid primary key default gen_random_uuid(),
  jurisdiction    text not null,
  event_date      date not null,
  title_key       text not null,
  description_key text not null,
  form_codes      text[] not null default '{}',
  recurrence      text,  -- 'monthly', 'quarterly', 'annual'
  created_at      timestamptz not null default now()
);

create index idx_tax_calendar_date on public.tax_calendar_events(event_date);

alter table public.tax_calendar_events enable row level security;
create policy "tax_calendar_read" on public.tax_calendar_events for select using (true);
