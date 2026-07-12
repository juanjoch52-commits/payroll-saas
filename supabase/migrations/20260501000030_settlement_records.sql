-- =============================================================================
-- MyJova — REC: registros CONGELADOS de liquidación (contabilidad anual)
-- =============================================================================
-- Problema que resuelve: las liquidaciones se recalculaban EN VIVO con la
-- asignación (employees.subcontractor_id) y el bill rate ACTUALES. Si un
-- trabajador cambia de contratista o de tarifa a mitad de año, los runs viejos
-- cambiarían retroactivamente → reporte anual de ingresos incorrecto.
-- Solución: al APROBAR un run se congela la liquidación de cada contratista
-- raíz en esta tabla (totales + líneas). Los reportes anuales leen SOLO de
-- aquí; el cálculo en vivo queda para previews de borradores.
-- =============================================================================

create table public.settlement_records (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  payroll_run_id   uuid not null references public.payroll_runs(id) on delete cascade,
  -- restrict: no se puede borrar un contratista con historia contable.
  subcontractor_id uuid not null references public.subcontractors(id) on delete restrict,

  -- Denormalizado del run para consultas anuales sin joins.
  period_start     date not null,
  period_end       date not null,
  pay_date         date not null,

  -- Totales congelados (mismos campos que Settlement del motor puro).
  subtotal_cents   int not null check (subtotal_cents >= 0),
  tax_pct          numeric(5, 2) not null default 0,
  tax_cents        int not null default 0,
  total_cents      int not null,
  pay_total_cents  int not null default 0,
  margin_cents     int not null default 0,

  -- Desglose por trabajador (SettlementLine[]) tal como se aprobó.
  lines            jsonb not null default '[]',

  created_at       timestamptz not null default now(),

  -- Un registro por run × contratista raíz: imposible duplicar.
  unique (payroll_run_id, subcontractor_id)
);

create index idx_settlement_records_org_year
  on public.settlement_records(organization_id, pay_date desc);

create index idx_settlement_records_sub
  on public.settlement_records(subcontractor_id, pay_date desc);

-- -----------------------------------------------------------------------------
-- RLS: manager+ de la org lee y escribe; el contratista lee SOLO los suyos.
-- -----------------------------------------------------------------------------
alter table public.settlement_records enable row level security;

create policy "settlement_records_manager" on public.settlement_records for all
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  )
  with check (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  );

create policy "settlement_records_contractor" on public.settlement_records for select
  using (
    organization_id in (select public.user_org_ids())
    and subcontractor_id in (select id from public.subcontractors where user_id = auth.uid())
  );
