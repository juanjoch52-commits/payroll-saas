-- =============================================================================
-- MyJova — H13: Beneficios / deducciones por empleado
-- =============================================================================
-- Deducciones recurrentes por empleado (salud, dental, 401k, etc.). pre_tax
-- reduce el ingreso gravable (federal/estatal); post-tax solo reduce el neto.
-- El motor las consume al calcular cada payroll item.
-- =============================================================================

create table public.employee_deductions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  employee_id      uuid not null references public.employees(id) on delete cascade,
  label            text not null,
  code             text not null,
  amount_cents     bigint not null check (amount_cents >= 0),
  pre_tax          boolean not null default false,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_emp_deductions_emp on public.employee_deductions(employee_id) where is_active;
create trigger trg_emp_deductions_updated_at before update on public.employee_deductions
  for each row execute function public.set_updated_at();

alter table public.employee_deductions enable row level security;
create policy "emp_deductions_select" on public.employee_deductions for select
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );
create policy "emp_deductions_write" on public.employee_deductions for all
  using (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager'))
  with check (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager'));
