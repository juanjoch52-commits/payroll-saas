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

-- Actualizar check_plan_feature para considerar overrides
create or replace function public.check_plan_feature(p_org_id uuid, p_key text)
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
  select enabled into v_override
  from public.feature_overrides
  where organization_id = p_org_id
    and flag_key = p_key
    and (expires_at is null or expires_at > now())
  limit 1;
  if v_override is not null then
    return v_override;
  end if;

  -- Si no hay override, ver el plan activo del tenant
  select coalesce((p.features ->> p_key)::boolean, false) into v_plan_has
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.organization_id = p_org_id
    and s.status in ('trialing', 'active')
  order by s.created_at desc
  limit 1;

  return coalesce(v_plan_has, false);
end;
$$;
