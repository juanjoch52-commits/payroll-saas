-- =============================================================================
-- MyJova — Migración 06: Payroll Runs + Items + Components
-- =============================================================================
-- Una "payroll run" es un período (ej. 2 semanas) que cubre a varios empleados.
-- Cada empleado genera un "payroll_item" con su gross, taxes y net.
-- Los "components" desglosan el item en líneas individuales (ganancias,
-- deducciones, impuestos) — útil para PDFs y auditoría.
-- =============================================================================

create type public.payroll_status as enum ('draft', 'approved', 'paid', 'posted');
create type public.component_type as enum ('earning', 'deduction', 'tax', 'employer_tax');

-- -----------------------------------------------------------------------------
-- Tabla: payroll_runs
-- -----------------------------------------------------------------------------
create table public.payroll_runs (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  jurisdiction_code   text not null references public.jurisdictions(code),
  period_start        date not null,
  period_end          date not null check (period_end >= period_start),
  pay_date            date not null,
  status              public.payroll_status not null default 'draft',
  name                text,  -- ej. "Q1 Week 4 — Sept 15-29"
  created_by          uuid references auth.users(id),
  approved_by         uuid references auth.users(id),
  approved_at         timestamptz,
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_payroll_runs_org on public.payroll_runs(organization_id, status);
create index idx_payroll_runs_period on public.payroll_runs(organization_id, period_start desc);

create trigger trg_payroll_runs_updated_at
  before update on public.payroll_runs
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Tabla: payroll_items
-- -----------------------------------------------------------------------------
-- Un item por empleado por run. `breakdown` guarda el JSON completo del
-- cálculo (inputs, intermediate values, scheme config snapshot) para
-- auditoría — si IRS pide explicación, esto la tiene.
create table public.payroll_items (
  id                          uuid primary key default gen_random_uuid(),
  payroll_run_id              uuid not null references public.payroll_runs(id) on delete cascade,
  employee_id                 uuid not null references public.employees(id),
  organization_id             uuid not null references public.organizations(id) on delete cascade,

  -- Inputs del período (depende del scheme)
  hours_worked                numeric(7,2),
  overtime_hours              numeric(7,2),
  days_worked                 numeric(5,2),
  sales_amount_cents          bigint,

  -- Cálculo
  gross_cents                 bigint not null default 0,
  federal_tax_cents           bigint not null default 0,
  state_tax_cents             bigint not null default 0,
  social_security_cents       bigint not null default 0,
  medicare_cents              bigint not null default 0,
  other_deductions_cents      bigint not null default 0,
  net_cents                   bigint not null default 0,

  -- Costos del employer (no afectan el net, pero los reportamos)
  employer_social_security_cents  bigint not null default 0,
  employer_medicare_cents         bigint not null default 0,
  employer_futa_cents             bigint not null default 0,

  -- Snapshot del cálculo para auditoría
  scheme_snapshot     jsonb not null default '{}'::jsonb,
  breakdown           jsonb not null default '{}'::jsonb,

  -- Notas / overrides manuales
  notes               text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (payroll_run_id, employee_id)
);

create index idx_payroll_items_run on public.payroll_items(payroll_run_id);
create index idx_payroll_items_employee on public.payroll_items(employee_id);
create index idx_payroll_items_org on public.payroll_items(organization_id);

create trigger trg_payroll_items_updated_at
  before update on public.payroll_items
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Tabla: payroll_components
-- -----------------------------------------------------------------------------
-- Líneas individuales del cálculo. Ej. para un empleado hourly con horas extra:
--   ('earning',  'regular_hours',  'Regular hours (40h × $25)',  100000)
--   ('earning',  'overtime_hours', 'Overtime (5h × $37.50)',     18750)
--   ('tax',      'federal_income', 'Federal income tax withheld', 12000)
--   ('tax',      'social_security','Social Security (6.2%)',      7361)
--   ('tax',      'medicare',       'Medicare (1.45%)',             1721)
create table public.payroll_components (
  id                  uuid primary key default gen_random_uuid(),
  payroll_item_id     uuid not null references public.payroll_items(id) on delete cascade,
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  component_type      public.component_type not null,
  code                text not null,
  label               text not null,
  amount_cents        bigint not null,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

create index idx_payroll_components_item on public.payroll_components(payroll_item_id);
create index idx_payroll_components_org on public.payroll_components(organization_id);
