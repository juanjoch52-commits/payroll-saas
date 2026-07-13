-- =============================================================================
-- MyJova — Subcontratistas jerárquicos (contratista → sub mayor → subs menores)
-- =============================================================================
-- Un subcontratista puede colgar de otro (parent_id). Los trabajadores se
-- asignan a un sub (employees.subcontractor_id) y fichan horas normalmente.
-- En nómina: sus items se calculan EN BRUTO (sin retenciones del tenant) y el
-- pago se consolida en UN cheque al sub RAÍZ del árbol, con desglose por
-- trabajador (ver settlement en la página del run).
-- =============================================================================

create table public.subcontractors (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  parent_id        uuid references public.subcontractors(id) on delete set null,
  name             text not null,
  contact_name     text,
  email            text,
  phone            text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint chk_sub_not_self_parent check (parent_id is null or parent_id <> id)
);
create index idx_subcontractors_org on public.subcontractors(organization_id) where is_active;
create index idx_subcontractors_parent on public.subcontractors(parent_id);
create trigger trg_subcontractors_updated_at before update on public.subcontractors
  for each row execute function public.set_updated_at();

alter table public.subcontractors enable row level security;
create policy "subcontractors_select" on public.subcontractors for select
  using (organization_id in (select public.user_org_ids()));
create policy "subcontractors_write" on public.subcontractors for all
  using (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager'))
  with check (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager'));

alter table public.employees
  add column if not exists subcontractor_id uuid references public.subcontractors(id) on delete set null;
create index if not exists idx_employees_subcontractor on public.employees(subcontractor_id);
