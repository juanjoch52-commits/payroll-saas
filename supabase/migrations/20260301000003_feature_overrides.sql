-- =============================================================================
-- MyJova — Migración: Feature overrides por tenant
-- =============================================================================
-- Permite al platform admin habilitar/deshabilitar features individuales
-- por tenant, override sobre lo que dice el plan. Útil para:
--   - Beta features para clientes específicos
--   - Recompensas / paquetes custom
--   - Deshabilitar funcionalidad temporalmente por incumplimiento
-- =============================================================================

create table public.feature_overrides (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  flag_key        text not null,
  enabled         boolean not null,
  reason          text,
  expires_at      timestamptz,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  unique (organization_id, flag_key)
);

create index idx_feature_overrides_org on public.feature_overrides(organization_id);

alter table public.feature_overrides enable row level security;

create policy "feature_overrides_admin_all" on public.feature_overrides
  for all using (public.is_platform_admin());

-- Tenants pueden leer sus propios overrides (para UI mostrar features extras)
create policy "feature_overrides_org_read" on public.feature_overrides
  for select using (organization_id in (select public.user_org_ids()));

-- Actualizar check_plan_feature para considerar overrides.
-- OJO: los parámetros DEBEN llamarse igual que en ...004_plans.sql (org_id,
-- feature_key): `create or replace` no puede renombrarlos, y además la app
-- llama al RPC con esos nombres (employees.ts, lib/auth/checkFeature.ts).
-- Bug de primera ejecución encontrado al aplicar contra el Supabase real
-- (2026-07-12): la versión original renombraba a p_org_id/p_key.
create or replace function public.check_plan_feature(org_id uuid, feature_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_override boolean;
  v_plan_has boolean;
begin
  -- Primero override si existe y no expiró
  select fo.enabled into v_override
  from public.feature_overrides fo
  where fo.organization_id = org_id
    and fo.flag_key = feature_key
    and (fo.expires_at is null or fo.expires_at > now())
  limit 1;
  if v_override is not null then
    return v_override;
  end if;

  -- Si no hay override, ver el plan activo del tenant
  select coalesce((p.features ->> feature_key)::boolean, false) into v_plan_has
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.organization_id = org_id
    and s.status in ('trialing', 'active')
  order by s.created_at desc
  limit 1;

  return coalesce(v_plan_has, false);
end;
$$;
