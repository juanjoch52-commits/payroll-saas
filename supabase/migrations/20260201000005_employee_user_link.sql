-- =============================================================================
-- MyJova — Migración 17: Vincular auth.users a employees
-- =============================================================================
-- Cuando un employee acepta su invitación, su cuenta auth.users.id se
-- registra en employees.user_id. Esto permite que el portal del empleado
-- (/clock, /history) sepa a qué fila de employees corresponde el caller.
-- =============================================================================

alter table public.employees
  add column user_id uuid references auth.users(id) on delete set null;

create unique index uq_employees_user_per_org
  on public.employees (organization_id, user_id)
  where user_id is not null;

create index idx_employees_user
  on public.employees(user_id)
  where user_id is not null;
