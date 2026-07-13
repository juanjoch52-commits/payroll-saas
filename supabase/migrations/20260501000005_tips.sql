-- =============================================================================
-- MyJova — H4: Propinas (tips)
-- =============================================================================
-- Captura de propinas por empleado/fecha, con aprobación, que entran a la
-- nómina como ingreso gravable. Las propinas pueden venir en efectivo, tarjeta,
-- de un pool repartido, o declaradas por el empleado; y pueden importarse del
-- POS (Square) con un external_id para deduplicar.
-- =============================================================================

create type public.tip_source as enum ('cash', 'card', 'pool', 'declared');

create table public.tip_entries (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  employee_id      uuid not null references public.employees(id) on delete cascade,
  work_date        date not null default current_date,
  amount_cents     bigint not null check (amount_cents >= 0),
  source           public.tip_source not null default 'card',
  status           public.time_entry_status not null default 'pending',
  reviewed_by      uuid references auth.users(id),
  reviewed_at      timestamptz,
  review_notes     text,
  payroll_item_id  uuid references public.payroll_items(id) on delete set null,
  external_id      text,   -- id del pago en Square (dedup)
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_tip_entries_emp_date on public.tip_entries(employee_id, work_date desc);
create index idx_tip_entries_org_status on public.tip_entries(organization_id, status);
create index idx_tip_entries_payroll on public.tip_entries(employee_id, status, work_date)
  where status = 'approved' and payroll_item_id is null;
create unique index uq_tip_entries_external on public.tip_entries(organization_id, external_id)
  where external_id is not null;

create trigger trg_tip_entries_updated_at before update on public.tip_entries
  for each row execute function public.set_updated_at();

alter table public.payroll_items add column tips_cents bigint;

-- RLS (mismo patrón que production_entries)
alter table public.tip_entries enable row level security;
create policy "tip_entries_select" on public.tip_entries for select
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );
create policy "tip_entries_insert" on public.tip_entries for insert
  with check (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );
create policy "tip_entries_update" on public.tip_entries for update
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or (
        employee_id in (select id from public.employees where user_id = auth.uid())
        and status = 'pending'
      )
    )
  );
create policy "tip_entries_delete" on public.tip_entries for delete
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin')
  );
