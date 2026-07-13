-- =============================================================================
-- MyJova — Migración 08: Integrations + API Keys + Webhook Events
-- =============================================================================
-- Preparación para integraciones externas (MyRavex, QuickBooks, futuras).
-- En MVP solo se usa la estructura — la lógica real de MyRavex se implementa
-- cuando esa plataforma esté lista.
-- =============================================================================

create type public.integration_provider as enum ('myravex', 'quickbooks', 'xero', 'gusto');
create type public.integration_status as enum ('disconnected', 'connecting', 'active', 'error', 'disabled');

-- -----------------------------------------------------------------------------
-- Tabla: integrations
-- -----------------------------------------------------------------------------
-- Una fila por (organization, provider). Guarda credenciales encriptadas
-- y configuración del enlace.
create table public.integrations (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  provider            public.integration_provider not null,
  status              public.integration_status not null default 'disconnected',
  config              jsonb not null default '{}'::jsonb,
  credentials_encrypted text,  -- tokens OAuth, API keys del 3rd party
  last_synced_at      timestamptz,
  last_error          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (organization_id, provider)
);

create trigger trg_integrations_updated_at
  before update on public.integrations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Tabla: api_keys
-- -----------------------------------------------------------------------------
-- API keys que terceros (incluyendo MyRavex) usan para acceder a la API
-- pública de MyJova. Solo guardamos el HASH de la key, nunca la key plana.
-- El prefijo (`jk_live_xxxx`) sí se guarda para identificación en el UI.
create table public.api_keys (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  name                text not null,  -- ej. "MyRavex Production"
  key_prefix          text not null,  -- primeros chars visibles, ej. "jk_live_a1b2"
  key_hash            text not null unique,  -- bcrypt del key completo
  scopes              text[] not null default '{}',  -- ej. {employees:read, payroll:write}
  last_used_at        timestamptz,
  expires_at          timestamptz,
  revoked_at          timestamptz,
  created_by          uuid references auth.users(id),
  created_at          timestamptz not null default now()
);

create index idx_api_keys_org on public.api_keys(organization_id);
create index idx_api_keys_prefix on public.api_keys(key_prefix);

-- -----------------------------------------------------------------------------
-- Tabla: webhook_events
-- -----------------------------------------------------------------------------
-- Log de TODOS los eventos recibidos de webhooks (Stripe, MyRavex, etc.).
-- Permite reprocesar si falla el handler la primera vez. Idempotencia
-- garantizada con `external_id` único por provider.
create table public.webhook_events (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid references public.organizations(id) on delete cascade,
  provider            text not null,  -- 'stripe', 'myravex', ...
  external_id         text,  -- id del evento en el provider (para deduplicación)
  event_type          text not null,
  payload             jsonb not null,
  processed_at        timestamptz,
  error               text,
  created_at          timestamptz not null default now(),
  unique (provider, external_id)
);

create index idx_webhook_events_provider on public.webhook_events(provider, processed_at);
create index idx_webhook_events_org on public.webhook_events(organization_id);
