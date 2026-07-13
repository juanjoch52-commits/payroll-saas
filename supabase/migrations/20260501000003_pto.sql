-- =============================================================================
-- MyJova — H2: Tiempo libre / PTO (vacaciones, enfermedad, personal)
-- =============================================================================
-- Políticas por organización + saldos por empleado + solicitudes con flujo de
-- aprobación. La acumulación (accrual) automática se ejecuta por cron en el
-- futuro usando accrual_method/accrual_rate; hoy se ajusta el saldo manualmente
-- y se descuenta al aprobar una solicitud pagada.
-- =============================================================================

create type public.pto_type as enum ('vacation', 'sick', 'personal', 'unpaid', 'other');
create type public.pto_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');

create table public.pto_policies (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  name               text not null,
  pto_type           public.pto_type not null default 'vacation',
  -- 'none' = manual, 'hours_per_period', 'days_per_year'
  accrual_method     text not null default 'none',
  accrual_rate       numeric(8,3) not null default 0,
  max_balance_hours  numeric(8,2),
  paid               boolean not null default true,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index idx_pto_policies_org on public.pto_policies(organization_id) where is_active;
create trigger trg_pto_policies_updated_at before update on public.pto_policies
  for each row execute function public.set_updated_at();

create table public.pto_balances (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  employee_id      uuid not null references public.employees(id) on delete cascade,
  policy_id        uuid not null references public.pto_policies(id) on delete cascade,
  balance_hours    numeric(9,2) not null default 0,
  updated_at       timestamptz not null default now(),
  unique (employee_id, policy_id)
);
create index idx_pto_balances_emp on public.pto_balances(employee_id);

create table public.time_off_requests (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  employee_id      uuid not null references public.employees(id) on delete cascade,
  policy_id        uuid references public.pto_policies(id) on delete set null,
  start_date       date not null,
  end_date         date not null,
  hours            numeric(8,2) not null check (hours >= 0),
  reason           text,
  status           public.pto_request_status not null default 'pending',
  reviewed_by      uuid references auth.users(id),
  reviewed_at      timestamptz,
  review_notes     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (end_date >= start_date)
);
create index idx_tor_org_status on public.time_off_requests(organization_id, status);
create index idx_tor_emp on public.time_off_requests(employee_id, start_date desc);
create trigger trg_tor_updated_at before update on public.time_off_requests
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.pto_policies enable row level security;
create policy "pto_policies_select" on public.pto_policies for select
  using (organization_id in (select public.user_org_ids()));
create policy "pto_policies_write" on public.pto_policies for all
  using (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin'))
  with check (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin'));

alter table public.pto_balances enable row level security;
create policy "pto_balances_select" on public.pto_balances for select
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );
-- Escritura de saldos solo manager+ (los ajustes finos van por service role).
create policy "pto_balances_write" on public.pto_balances for all
  using (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager'))
  with check (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager'));

alter table public.time_off_requests enable row level security;
create policy "tor_select" on public.time_off_requests for select
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );
create policy "tor_insert" on public.time_off_requests for insert
  with check (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );
create policy "tor_update" on public.time_off_requests for update
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or (
        employee_id in (select id from public.employees where user_id = auth.uid())
        and status = 'pending'  -- el empleado solo edita/cancela mientras esté pendiente
      )
    )
  );
