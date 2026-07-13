-- =============================================================================
-- MyJova — Migración 14: Worksites (sitios de trabajo)
-- =============================================================================
-- Tabla opcional para definir ubicaciones físicas. Cuando un employee hace
-- clock in cerca de un worksite, lo vinculamos. Si está fuera del radio,
-- marcamos la entry con `outside_geofence=true` (no bloqueamos, solo
-- alertamos al manager).
-- =============================================================================

create table public.worksites (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  address         text,
  -- Coordenadas geográficas. numeric(9,6) da precisión ~10cm.
  latitude        numeric(9,6) not null check (latitude between -90 and 90),
  longitude       numeric(9,6) not null check (longitude between -180 and 180),
  radius_m        int not null default 100 check (radius_m between 10 and 100000),
  is_active       boolean not null default true,
  notes           text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_worksites_org_active on public.worksites(organization_id)
  where is_active = true;

create trigger trg_worksites_updated_at
  before update on public.worksites
  for each row execute function public.set_updated_at();
