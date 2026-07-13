-- =============================================================================
-- MyJova — Migración G1b: production_entries (registros de producción a destajo)
-- =============================================================================
-- Modelada sobre time_entries: hereda el ciclo de aprobación (pending →
-- approved/rejected/edited, reusa el enum time_entry_status) y el vínculo
-- "consumido por payroll" (payroll_item_id). Cuando se calcula una run, las
-- entries aprobadas y sin payroll_item_id se agregan por empleado igual que
-- los minutos facturables de time_entries.
--
-- Una entry = una cantidad producida en una fecha. El rate puede venir snapshot
-- (rate_per_unit_cents) o resolverse contra el scheme 'piecerate' activo.
-- =============================================================================

create table public.production_entries (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  employee_id         uuid not null references public.employees(id) on delete cascade,
  worksite_id         uuid references public.worksites(id),
  -- quién registró: manager, el propio empleado, o null si vino de un kiosko
  -- (G5 añade kiosk_device_id a esta tabla).
  recorded_by         uuid references auth.users(id),

  work_date           date not null default current_date,
  unit_code           text not null,                 -- ej. 'boxes', 'shirts', 'units'
  unit_label          text,                          -- etiqueta legible mostrada en paystub
  quantity            numeric(12,3) not null check (quantity >= 0),
  -- Snapshot del rate al registrar. null = usar rate del scheme piecerate activo.
  rate_per_unit_cents bigint check (rate_per_unit_cents is null or rate_per_unit_cents >= 0),

  -- Aprobación (mismo enum que time_entries)
  status              public.time_entry_status not null default 'pending',
  reviewed_by         uuid references auth.users(id),
  reviewed_at         timestamptz,
  review_notes        text,

  -- Vínculo a payroll (al calcular una run, marcamos las entries consumidas)
  payroll_item_id     uuid references public.payroll_items(id) on delete set null,

  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_production_entries_emp_date
  on public.production_entries(employee_id, work_date desc);

create index idx_production_entries_org_status
  on public.production_entries(organization_id, status);

-- Para queries de payroll: entries aprobadas sin consumir, por empleado.
create index idx_production_entries_payroll
  on public.production_entries(employee_id, status, work_date)
  where status = 'approved' and payroll_item_id is null;

create trigger trg_production_entries_updated_at
  before update on public.production_entries
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Columnas piece-rate en payroll_items (para paystub + reportes)
-- -----------------------------------------------------------------------------
alter table public.payroll_items
  add column units_produced        numeric(12,3),
  add column production_amount_cents bigint;

-- -----------------------------------------------------------------------------
-- RLS — mismo patrón que time_entries (20260201000006_rls_extensions.sql):
--   empleado ve/registra lo suyo; manager+ ve/gestiona todo; admin/owner borra.
-- -----------------------------------------------------------------------------
alter table public.production_entries enable row level security;

create policy "production_entries_select" on public.production_entries for select
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );

create policy "production_entries_insert" on public.production_entries for insert
  with check (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or (
        public.user_role_in(organization_id) = 'employee'
        and employee_id in (select id from public.employees where user_id = auth.uid())
      )
    )
  );

create policy "production_entries_update" on public.production_entries for update
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or (
        public.user_role_in(organization_id) = 'employee'
        and employee_id in (select id from public.employees where user_id = auth.uid())
        and status = 'pending'  -- empleado solo edita lo suyo aún sin revisar
      )
    )
  );

create policy "production_entries_delete" on public.production_entries for delete
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin')
  );
