-- =============================================================================
-- MyJova — CTR-1b: privacidad del bill rate + portal del contratista
-- =============================================================================
-- 1) PRIVACIDAD: employees.bill_rate_cents (lo que el contratista factura a la
--    empresa por ese trabajador) era legible por el propio trabajador vía RLS
--    de su fila. Se mueve a employee_billing, solo manager+ (el portal del
--    contratista lee server-side con service role, scoped a su subtree).
-- 2) subcontractors.user_id: login del contratista (se setea al aceptar la
--    invitación con rol 'contractor').
-- 3) invitations.subcontractor_id: a qué contratista vincula la invitación.
-- 4) organizations.uses_subcontractors: las orgs "normales" (empresa +
--    empleados por hora/día/salario) nunca ven el módulo — multitenant por
--    flag, no por bifurcación de producto.
-- =============================================================================

-- 1) Tabla privada de facturación por trabajador ------------------------------
create table public.employee_billing (
  employee_id      uuid primary key references public.employees(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  bill_rate_cents  int check (bill_rate_cents >= 0),
  updated_at       timestamptz not null default now()
);

create index idx_employee_billing_org on public.employee_billing(organization_id);

create trigger trg_employee_billing_updated_at
  before update on public.employee_billing
  for each row execute function public.set_updated_at();

-- Copiar datos existentes y eliminar la columna expuesta.
insert into public.employee_billing (employee_id, organization_id, bill_rate_cents)
select id, organization_id, bill_rate_cents
from public.employees
where bill_rate_cents is not null;

alter table public.employees drop column bill_rate_cents;

-- RLS: SOLO manager+ de la org. Ni el trabajador ni el contratista tienen
-- policy (el portal del contratista lee vía service role scoped al subtree).
alter table public.employee_billing enable row level security;

create policy "employee_billing_manager" on public.employee_billing for all
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  )
  with check (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  );

-- 2) Login del contratista ----------------------------------------------------
alter table public.subcontractors
  add column user_id uuid references auth.users(id) on delete set null;

-- Un usuario no puede ser dueño de dos contratistas en la MISMA org (sí puede
-- serlo en orgs distintas: trabaja para dos empresas).
create unique index uq_subcontractors_user_per_org
  on public.subcontractors (organization_id, user_id)
  where user_id is not null;

-- 3) Invitación → contratista -------------------------------------------------
alter table public.invitations
  add column subcontractor_id uuid references public.subcontractors(id) on delete set null;

-- 4) Flag multitenant del módulo ----------------------------------------------
alter table public.organizations
  add column uses_subcontractors boolean not null default false;

-- Backfill: las orgs que ya tienen contratistas quedan con el módulo visible.
update public.organizations o
set uses_subcontractors = true
where exists (select 1 from public.subcontractors s where s.organization_id = o.id);
