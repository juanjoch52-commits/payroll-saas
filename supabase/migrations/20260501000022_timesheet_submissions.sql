-- =============================================================================
-- MyJova — TS-1b: cierre de semana / solicitud de pago (timesheet_submissions)
-- =============================================================================
-- El empleado "cierra" su semana (lunes-domingo, timezone de la org): snapshot
-- de sus horas + solicitud de pago. El manager aprueba la semana completa (eso
-- aprueba en bloque las time_entries pending/edited de ese rango, que es lo que
-- consume payroll) o la devuelve con nota para que el empleado la corrija y
-- re-someta.
--
-- Flujo de status:
--   submitted → empleado cerró la semana, espera revisión
--   approved  → manager aprobó (entries de la semana quedaron 'approved')
--   rejected  → manager la devolvió con nota; el empleado puede re-someter
--               (la fila vuelve a 'submitted' — unique por employee+week_start)
-- =============================================================================

create type public.timesheet_submission_status as enum ('submitted', 'approved', 'rejected');

create table public.timesheet_submissions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  employee_id      uuid not null references public.employees(id) on delete cascade,

  -- Semana local de la org: week_start = lunes, week_end = domingo (inclusivo).
  week_start       date not null,
  week_end         date not null,

  -- Snapshot al someter (se refresca al aprobar): minutos facturables de las
  -- entries pending/edited/approved de la semana y cuántas entries son.
  total_minutes    int not null default 0 check (total_minutes >= 0),
  entry_count      int not null default 0 check (entry_count >= 0),

  employee_note    text,

  status           public.timesheet_submission_status not null default 'submitted',
  submitted_at     timestamptz not null default now(),
  reviewed_by      uuid references auth.users(id),
  reviewed_at      timestamptz,
  review_note      text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (employee_id, week_start),
  check (week_end >= week_start)
);

create index idx_timesheet_submissions_org_status
  on public.timesheet_submissions(organization_id, status, submitted_at desc);

create index idx_timesheet_submissions_emp
  on public.timesheet_submissions(employee_id, week_start desc);

create trigger trg_timesheet_submissions_updated_at
  before update on public.timesheet_submissions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.timesheet_submissions enable row level security;

-- Lectura: manager+ ve las de su org; el empleado ve las suyas.
create policy "tsheet_select" on public.timesheet_submissions for select
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );

-- Insert: el empleado crea la suya (o manager+ en su nombre).
create policy "tsheet_insert" on public.timesheet_submissions for insert
  with check (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );

-- Update del empleado: SOLO re-someter una semana devuelta.
-- USING exige fila vieja 'rejected'; WITH CHECK exige fila nueva 'submitted'.
create policy "tsheet_update_employee" on public.timesheet_submissions for update
  using (
    organization_id in (select public.user_org_ids())
    and employee_id in (select id from public.employees where user_id = auth.uid())
    and status = 'rejected'
  )
  with check (
    organization_id in (select public.user_org_ids())
    and employee_id in (select id from public.employees where user_id = auth.uid())
    and status = 'submitted'
  );

-- Update del manager: revisar (aprobar/devolver).
create policy "tsheet_update_manager" on public.timesheet_submissions for update
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  )
  with check (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  );
