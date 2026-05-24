-- =============================================================================
-- MyJova — Migración 04: Plans + Subscriptions
-- =============================================================================
-- Define los 3 tiers de MyJova y guarda la suscripción activa de cada org.
-- =============================================================================

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete'
);

-- -----------------------------------------------------------------------------
-- Tabla: plans (catálogo público)
-- -----------------------------------------------------------------------------
-- `features` es jsonb con feature flags. Ejemplo:
--   { "payroll": true, "tax_forms": false, "api_access": false, "myravex": false }
-- El helper `check_plan_feature(org_id, key)` consulta esto.
create table public.plans (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique check (code in ('essential', 'advanced', 'premium')),
  name                text not null,
  monthly_price_cents int not null,
  max_employees       int,  -- null = ilimitado
  stripe_price_id     text,  -- se rellena cuando se crean los productos en Stripe
  features            jsonb not null default '{}'::jsonb,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now()
);

-- Seed: los 3 tiers de MyJova
insert into public.plans (code, name, monthly_price_cents, max_employees, features, sort_order) values
  (
    'essential',
    'Esencial',
    4900,
    10,
    jsonb_build_object(
      'payroll_hourly', true,
      'payroll_salary', true,
      'payroll_daily', false,
      'payroll_commission', false,
      'tax_forms', false,
      'multi_user', false,
      'api_access', false,
      'myravex_integration', false,
      'priority_support', false
    ),
    1
  ),
  (
    'advanced',
    'Avanzado',
    9900,
    50,
    jsonb_build_object(
      'payroll_hourly', true,
      'payroll_salary', true,
      'payroll_daily', true,
      'payroll_commission', true,
      'tax_forms', true,
      'multi_user', true,
      'api_access', false,
      'myravex_integration', false,
      'priority_support', false
    ),
    2
  ),
  (
    'premium',
    'Premium Bundle',
    19900,
    null,
    jsonb_build_object(
      'payroll_hourly', true,
      'payroll_salary', true,
      'payroll_daily', true,
      'payroll_commission', true,
      'tax_forms', true,
      'multi_user', true,
      'api_access', true,
      'myravex_integration', true,
      'priority_support', true
    ),
    3
  );

-- -----------------------------------------------------------------------------
-- Tabla: subscriptions
-- -----------------------------------------------------------------------------
-- Una fila por organization. Status sigue el modelo de Stripe.
create table public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null unique references public.organizations(id) on delete cascade,
  plan_id                 uuid not null references public.plans(id),
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  status                  public.subscription_status not null default 'trialing',
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  trial_ends_at           timestamptz,
  cancel_at_period_end    boolean not null default false,
  canceled_at             timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index idx_subscriptions_status on public.subscriptions(status);

create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Helper: check_plan_feature(org_id, feature_key) → bool
-- -----------------------------------------------------------------------------
-- Llamado desde Server Actions y desde policies RLS para gating de features.
create or replace function public.check_plan_feature(org_id uuid, feature_key text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((p.features ->> feature_key)::boolean, false)
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.organization_id = org_id
    and s.status in ('trialing', 'active')
  limit 1;
$$;
