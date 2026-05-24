-- =============================================================================
-- MyJova — Migración 15: Time entries (clock in/out)
-- =============================================================================
-- Una entry por par clock_in/clock_out. Mientras está abierta (clock_out_at
-- is null), el employee NO puede crear otra (constraint unique parcial).
--
-- El status fluye así:
--   open    → entry recién creado, espera clock_out
--   pending → clock_out ya hecho, espera aprobación del manager
--   approved → aprobado, listo para entrar a payroll
--   rejected → manager lo rechazó (no entra a payroll)
--   edited   → manager modificó horas; trazabilidad en review_notes
-- =============================================================================

create type public.time_entry_status as enum ('open', 'pending', 'approved', 'rejected', 'edited');

create table public.time_entries (
  id                          uuid primary key default gen_random_uuid(),
  organization_id             uuid not null references public.organizations(id) on delete cascade,
  employee_id                 uuid not null references public.employees(id) on delete cascade,
  -- user_id: el auth.users que clockeó (puede ser null si admin lo creó manual)
  user_id                     uuid references auth.users(id),
  worksite_id                 uuid references public.worksites(id),

  -- Clock in
  clock_in_at                 timestamptz not null default now(),
  clock_in_lat                numeric(9,6),
  clock_in_lng                numeric(9,6),
  clock_in_accuracy_m         numeric(8,2),
  clock_in_photo_path         text,
  clock_in_outside_geofence   boolean not null default false,

  -- Clock out (null mientras está abierto)
  clock_out_at                timestamptz,
  clock_out_lat               numeric(9,6),
  clock_out_lng               numeric(9,6),
  clock_out_accuracy_m        numeric(8,2),
  clock_out_photo_path        text,
  clock_out_outside_geofence  boolean not null default false,

  -- Cálculos (se llenan al clock out)
  duration_minutes            int,
  break_minutes               int not null default 0,
  billable_minutes            int,

  -- Aprobación
  status                      public.time_entry_status not null default 'open',
  reviewed_by                 uuid references auth.users(id),
  reviewed_at                 timestamptz,
  review_notes                text,

  -- Edición manual: si el manager cambió horas, guarda los originales aquí.
  original_clock_in_at        timestamptz,
  original_clock_out_at       timestamptz,
  original_billable_minutes   int,

  -- Vinculo a payroll (al calcular una run, marcamos las entries consumidas)
  payroll_item_id             uuid references public.payroll_items(id) on delete set null,

  notes                       text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index idx_time_entries_emp_time
  on public.time_entries(employee_id, clock_in_at desc);

create index idx_time_entries_org_status
  on public.time_entries(organization_id, status);

create index idx_time_entries_org_open
  on public.time_entries(organization_id)
  where clock_out_at is null;

-- Para queries de payroll: entries aprobadas en un período por empleado
create index idx_time_entries_payroll
  on public.time_entries(employee_id, status, clock_in_at)
  where status = 'approved' and payroll_item_id is null;

-- Solo UN entry abierto por employee a la vez (constraint a nivel DB)
create unique index uq_time_entries_one_open
  on public.time_entries (employee_id)
  where clock_out_at is null;

create trigger trg_time_entries_updated_at
  before update on public.time_entries
  for each row execute function public.set_updated_at();
