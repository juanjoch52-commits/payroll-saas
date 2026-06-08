-- =============================================================================
-- MyJova — H12: Webhooks salientes (outbound)
-- =============================================================================
-- Endpoints HTTP por organización que reciben POSTs firmados con HMAC-SHA256
-- ante eventos del sistema (payroll.approved, time_entry.approved,
-- employee.created). El dispatcher vive en src/lib/webhooks/dispatch.ts y firma
-- el cuerpo con `secret`. `webhook_deliveries` guarda el log de cada intento.
-- =============================================================================

create table public.webhook_endpoints (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  url              text not null,
  secret           text not null,
  events           text[] not null default '{}',
  description      text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_webhook_endpoints_org on public.webhook_endpoints(organization_id) where is_active;
create trigger trg_webhook_endpoints_updated_at before update on public.webhook_endpoints
  for each row execute function public.set_updated_at();

create table public.webhook_deliveries (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  endpoint_id      uuid not null references public.webhook_endpoints(id) on delete cascade,
  event            text not null,
  payload          jsonb,
  status_code      integer,
  ok               boolean not null default false,
  error            text,
  created_at       timestamptz not null default now()
);
create index idx_webhook_deliveries_endpoint on public.webhook_deliveries(endpoint_id, created_at desc);

alter table public.webhook_endpoints enable row level security;
alter table public.webhook_deliveries enable row level security;

-- Solo managers (owner/admin/manager) gestionan endpoints de su org.
create policy "webhook_endpoints_select" on public.webhook_endpoints for select
  using (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager'));
create policy "webhook_endpoints_write" on public.webhook_endpoints for all
  using (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager'))
  with check (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager'));

-- Deliveries: solo lectura para managers; la escritura la hace el dispatcher con
-- service role (bypassa RLS). No se exponen políticas de insert/update.
create policy "webhook_deliveries_select" on public.webhook_deliveries for select
  using (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager'));
