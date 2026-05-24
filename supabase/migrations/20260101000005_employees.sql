-- =============================================================================
-- MyJova — Migración 05: Employees + Pay Schemes
-- =============================================================================
-- Cada empleado pertenece a UNA organization. El esquema de pago se modela
-- como una tabla aparte (`pay_schemes`) con history — permite cambiar el
-- pay scheme de un empleado preservando registro de su esquema anterior.
-- =============================================================================

create type public.employee_status as enum ('active', 'on_leave', 'terminated');
create type public.employee_type as enum ('employee', 'contractor');
create type public.filing_status as enum ('single', 'married_jointly', 'married_separately', 'head_of_household');
create type public.pay_scheme_type as enum ('hourly', 'salary', 'daily', 'commission');

-- -----------------------------------------------------------------------------
-- Tabla: employees
-- -----------------------------------------------------------------------------
create table public.employees (
  id                          uuid primary key default gen_random_uuid(),
  organization_id             uuid not null references public.organizations(id) on delete cascade,

  -- Datos personales
  first_name                  text not null,
  last_name                   text not null,
  email                       citext,
  phone                       text,

  -- Empleo
  hire_date                   date not null,
  termination_date            date,
  status                      public.employee_status not null default 'active',
  employee_type               public.employee_type not null default 'employee',
  job_title                   text,

  -- Datos fiscales
  -- NOTA: El SSN/SIN se guarda encriptado a nivel aplicación antes de insertar.
  -- En MVP usamos columna `text` con valor pre-encriptado (AES) que solo se
  -- puede desencriptar en Server Actions. Mover a pgsodium en Phase 2.
  tax_id_encrypted            text,
  tax_id_last_four            text,  -- para mostrar en UI sin desencriptar
  primary_jurisdiction_code   text not null references public.jurisdictions(code),
  w4_filing_status            public.filing_status not null default 'single',
  w4_dependents               int not null default 0,
  w4_other_income_cents       bigint not null default 0,
  w4_deductions_cents         bigint not null default 0,
  w4_extra_withholding_cents  bigint not null default 0,

  -- Dirección (jsonb para flexibilidad ES/EN/formats)
  address                     jsonb not null default '{}'::jsonb,

  -- Integraciones externas (MyRavex, QuickBooks, etc.)
  external_employee_id        text,

  -- Auditoría
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index idx_employees_org on public.employees(organization_id);
create index idx_employees_status on public.employees(organization_id, status);
create index idx_employees_external on public.employees(external_employee_id)
  where external_employee_id is not null;

create trigger trg_employees_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Tabla: pay_schemes
-- -----------------------------------------------------------------------------
-- Esquemas de pago vigentes y pasados de cada empleado.
-- Modelo polimórfico: `scheme_type` + `config` jsonb cuyo shape depende del type:
--   hourly:     { "rate_cents": 2500, "overtime_multiplier": 1.5, "overtime_threshold_hours": 40 }
--   salary:     { "annual_cents": 6000000, "periods_per_year": 26 }
--   daily:      { "daily_rate_cents": 20000 }
--   commission: { "base_cents": 200000, "rate_pct": 0.10, "tiers": [...] }
--
-- El motor de nómina valida el shape via Zod en TypeScript antes de calcular.
create table public.pay_schemes (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references public.employees(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scheme_type     public.pay_scheme_type not null,
  config          jsonb not null,
  effective_from  date not null,
  effective_to    date,  -- null = vigente
  created_at      timestamptz not null default now()
);

create index idx_pay_schemes_employee on public.pay_schemes(employee_id, effective_from desc);
create index idx_pay_schemes_org on public.pay_schemes(organization_id);

-- Constraint: solo UN scheme activo por empleado (effective_to is null)
create unique index uq_pay_schemes_active_per_employee
  on public.pay_schemes (employee_id)
  where effective_to is null;
