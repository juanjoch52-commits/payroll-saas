-- =============================================================================
-- MyJova — H11: Departamentos / equipos
-- =============================================================================
create table public.departments (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_departments_org on public.departments(organization_id) where is_active;
create trigger trg_departments_updated_at before update on public.departments
  for each row execute function public.set_updated_at();

alter table public.employees
  add column department_id uuid references public.departments(id) on delete set null;

alter table public.departments enable row level security;
create policy "departments_select" on public.departments for select
  using (organization_id in (select public.user_org_ids()));
create policy "departments_write" on public.departments for all
  using (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager'))
  with check (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager'));
