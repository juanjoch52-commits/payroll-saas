-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Create custom types
create type user_role as enum ('admin', 'manager', 'employee');
create type payroll_status as enum ('draft', 'processing', 'completed', 'paid');
create type employee_status as enum ('active', 'inactive', 'terminated');

-- ============================================================================
-- COMPANIES TABLE
-- ============================================================================
create table companies (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  legal_name text,
  ein text unique, -- Federal Tax ID (Employer Identification Number)
  address text not null,
  city text not null,
  state text not null,
  zip text not null,
  country text default 'USA',
  phone text,
  email text,
  website text,
  industry text, -- 'construction', 'remodeling', 'automotive', 'restaurant'
  employee_count integer,
  subscription_plan text default 'starter', -- 'starter', 'professional', 'enterprise'
  subscription_status text default 'active', -- 'active', 'paused', 'canceled'
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table companies enable row level security;

create policy "Users can view their own company"
  on companies for select
  using (auth.uid() = user_id);

create policy "Users can update their own company"
  on companies for update
  using (auth.uid() = user_id);

-- ============================================================================
-- COMPANY USERS (TEAM MEMBERS)
-- ============================================================================
create table company_users (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role user_role default 'employee',
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(company_id, user_id)
);

alter table company_users enable row level security;

create policy "Users can view company members"
  on company_users for select
  using (
    company_id in (
      select id from companies where auth.uid() = user_id
    )
  );

-- ============================================================================
-- EMPLOYEES TABLE
-- ============================================================================
create table employees (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  ssn text, -- Last 4 digits for display
  hire_date date not null,
  birth_date date,
  status employee_status default 'active',
  department text,
  job_title text,
  manager_id uuid references employees(id),

  -- Compensation
  salary numeric(12, 2), -- Annual or for salaried employees
  hourly_rate numeric(10, 2), -- For hourly employees
  is_hourly boolean default false,
  pay_frequency text default 'biweekly', -- 'weekly', 'biweekly', 'semimonthly', 'monthly'

  -- Address Info
  address text,
  city text,
  state text,
  zip text,

  -- Tax Information
  federal_withholding_status text default 'single', -- 'single', 'married', 'head_of_household'
  federal_allowances integer default 0,
  state_withholding_status text,
  state_allowances integer,

  -- Direct Deposit (future)
  bank_account_last_4 text,

  -- Metadata
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  unique(company_id, email)
);

alter table employees enable row level security;

create policy "Company can view their employees"
  on employees for select
  using (
    company_id in (
      select id from companies where auth.uid() = user_id
    )
  );

-- ============================================================================
-- PAYROLL RUNS (Periods/Batches)
-- ============================================================================
create table payroll_runs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  pay_period_start date not null,
  pay_period_end date not null,
  pay_date date not null,
  status payroll_status default 'draft',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table payroll_runs enable row level security;

create policy "Company can view their payroll runs"
  on payroll_runs for select
  using (
    company_id in (
      select id from companies where auth.uid() = user_id
    )
  );

-- ============================================================================
-- PAYROLL ITEMS (Individual Pay Details)
-- ============================================================================
create table payroll_items (
  id uuid primary key default uuid_generate_v4(),
  payroll_run_id uuid not null references payroll_runs(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,

  -- Earnings
  hours_worked numeric(10, 2) default 0,
  regular_hours numeric(10, 2) default 0,
  overtime_hours numeric(10, 2) default 0,
  gross_pay numeric(12, 2) not null,

  -- Deductions
  federal_income_tax numeric(10, 2) default 0,
  social_security_tax numeric(10, 2) default 0,
  medicare_tax numeric(10, 2) default 0,
  state_income_tax numeric(10, 2) default 0,
  local_income_tax numeric(10, 2) default 0,

  -- Voluntary Deductions
  health_insurance numeric(10, 2) default 0,
  retirement_401k numeric(10, 2) default 0,
  other_deductions numeric(10, 2) default 0,

  -- Net Pay
  total_deductions numeric(12, 2) default 0,
  net_pay numeric(12, 2) not null,

  -- Status
  is_paid boolean default false,
  paid_date date,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  unique(payroll_run_id, employee_id)
);

alter table payroll_items enable row level security;

create policy "Company can view their payroll items"
  on payroll_items for select
  using (
    payroll_run_id in (
      select id from payroll_runs where company_id in (
        select id from companies where auth.uid() = user_id
      )
    )
  );

-- ============================================================================
-- AUDIT LOG
-- ============================================================================
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id),
  user_id uuid references auth.users(id),
  action text not null, -- 'create', 'update', 'delete'
  table_name text not null,
  record_id text not null,
  changes jsonb, -- old_values, new_values
  ip_address text,
  user_agent text,
  created_at timestamp with time zone default now()
);

alter table audit_logs enable row level security;

create policy "Company can view their audit logs"
  on audit_logs for select
  using (
    company_id in (
      select id from companies where auth.uid() = user_id
    )
  );

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================
create index idx_companies_user_id on companies(user_id);
create index idx_company_users_company_id on company_users(company_id);
create index idx_employees_company_id on employees(company_id);
create index idx_employees_status on employees(status);
create index idx_payroll_runs_company_id on payroll_runs(company_id);
create index idx_payroll_runs_dates on payroll_runs(pay_period_start, pay_period_end);
create index idx_payroll_items_payroll_run on payroll_items(payroll_run_id);
create index idx_payroll_items_employee on payroll_items(employee_id);
create index idx_audit_logs_company_id on audit_logs(company_id);
create index idx_audit_logs_created_at on audit_logs(created_at);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_companies_updated_at before update on companies
  for each row execute function update_updated_at_column();

create trigger update_employees_updated_at before update on employees
  for each row execute function update_updated_at_column();

create trigger update_payroll_runs_updated_at before update on payroll_runs
  for each row execute function update_updated_at_column();

create trigger update_payroll_items_updated_at before update on payroll_items
  for each row execute function update_updated_at_column();

-- ============================================================================
-- VIEWS for Reports
-- ============================================================================

-- Payroll Summary View
create view payroll_summary as
select
  pr.id as payroll_run_id,
  pr.company_id,
  pr.pay_period_start,
  pr.pay_period_end,
  pr.status,
  count(pi.id) as total_employees,
  sum(pi.gross_pay) as total_gross,
  sum(pi.federal_income_tax) as total_federal_tax,
  sum(pi.social_security_tax) as total_ss_tax,
  sum(pi.medicare_tax) as total_medicare_tax,
  sum(pi.net_pay) as total_net_pay
from payroll_runs pr
left join payroll_items pi on pr.id = pi.payroll_run_id
group by pr.id, pr.company_id, pr.pay_period_start, pr.pay_period_end, pr.status;

-- Employee Compensation View
create view employee_compensation_summary as
select
  e.id,
  e.company_id,
  e.first_name,
  e.last_name,
  e.job_title,
  e.salary,
  e.hourly_rate,
  e.pay_frequency,
  count(pi.id) as payroll_runs_ytd,
  sum(pi.gross_pay) as total_gross_ytd,
  sum(pi.net_pay) as total_net_ytd
from employees e
left join payroll_items pi on e.id = pi.employee_id
where e.status = 'active'
group by e.id, e.company_id, e.first_name, e.last_name, e.job_title, e.salary, e.hourly_rate, e.pay_frequency;
