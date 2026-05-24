-- =============================================================================
-- MyJova — Migración 02: Organizations + Memberships + Invitations
-- =============================================================================
-- Estas son las tablas raíz del modelo multi-tenant:
--   - `organizations` = cada cliente de MyJova (una empresa).
--   - `memberships`   = relación user ↔ organization con un rol.
--   - `invitations`   = links de invitación pendiente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos enum
-- -----------------------------------------------------------------------------
create type public.membership_role as enum ('owner', 'admin', 'manager', 'viewer');

-- -----------------------------------------------------------------------------
-- Tabla: organizations
-- -----------------------------------------------------------------------------
-- Cada fila es un "tenant" en MyJova. El propietario inicial (owner_user_id)
-- queda registrado para auditoría, pero los permisos reales viven en
-- `memberships`. Una org puede tener múltiples owners si así se decide.
create table public.organizations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  owner_user_id   uuid not null references auth.users(id) on delete restrict,
  country         text not null default 'US' check (country in ('US', 'CA')),
  default_locale  text not null default 'en' check (default_locale in ('en', 'es')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_organizations_owner on public.organizations(owner_user_id);

-- -----------------------------------------------------------------------------
-- Tabla: memberships
-- -----------------------------------------------------------------------------
-- Relaciona un user de Supabase Auth con una organization y un rol.
-- Esta es la fuente de verdad para multi-tenancy: las políticas RLS
-- consultan esta tabla para decidir qué datos puede ver cada user.
create table public.memberships (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            public.membership_role not null default 'viewer',
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index idx_memberships_user on public.memberships(user_id);
create index idx_memberships_org on public.memberships(organization_id);

-- -----------------------------------------------------------------------------
-- Tabla: invitations
-- -----------------------------------------------------------------------------
-- Cuando un admin invita a alguien que NO tiene cuenta aún en MyJova, se
-- crea una fila aquí con un token aleatorio. El email recibe un link
-- que apunta a /accept-invite?token=...
create table public.invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email           citext not null,
  role            public.membership_role not null default 'viewer',
  token           text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by      uuid not null references auth.users(id) on delete cascade,
  expires_at      timestamptz not null default (now() + interval '14 days'),
  accepted_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_invitations_org on public.invitations(organization_id);
create index idx_invitations_email on public.invitations(email);

-- -----------------------------------------------------------------------------
-- Helper: trigger para actualizar `updated_at` automáticamente
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Helper de RLS: devuelve los organization_id a los que pertenece el user
-- -----------------------------------------------------------------------------
-- Usada por casi TODAS las políticas RLS. La marcamos `security definer`
-- para que pueda leer `memberships` aunque el caller tenga RLS aplicado.
create or replace function public.user_org_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select organization_id
  from public.memberships
  where user_id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- Helper: rol del user en una organization específica
-- -----------------------------------------------------------------------------
create or replace function public.user_role_in(org_id uuid)
returns public.membership_role
language sql
security definer
stable
set search_path = public
as $$
  select role
  from public.memberships
  where user_id = auth.uid() and organization_id = org_id
  limit 1;
$$;
