-- =============================================================================
-- MyJova — Migración 18: RLS para worksites + time_entries
-- =============================================================================
-- Patrón especial para time_entries: los EMPLEADOS solo ven sus propias
-- entries (filtramos por user_id = auth.uid() o por employee.user_id).
-- Los manager+ ven todas las de su org.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- worksites
-- ----------------------------------------------------------------------------
alter table public.worksites enable row level security;

create policy "worksites_select" on public.worksites for select
  using (organization_id in (select public.user_org_ids()));

create policy "worksites_insert" on public.worksites for insert
  with check (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  );

create policy "worksites_update" on public.worksites for update
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  );

create policy "worksites_delete" on public.worksites for delete
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin')
  );

-- ----------------------------------------------------------------------------
-- time_entries
-- ----------------------------------------------------------------------------
alter table public.time_entries enable row level security;

-- SELECT:
--   - Empleados (role='employee') ven solo las suyas (employee_id pertenece a su employees row con user_id = auth.uid()).
--   - Manager/admin/owner ven todas las de su org.
create policy "time_entries_select" on public.time_entries for select
  using (
    organization_id in (select public.user_org_ids())
    and (
      -- Manager o superior: ven todo
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      -- O bien es su propio entry (empleado mirando lo suyo)
      or employee_id in (
        select id from public.employees where user_id = auth.uid()
      )
    )
  );

-- INSERT:
--   - Un employee puede crear SU PROPIO entry (clock in).
--   - Manager+ pueden crear entries en nombre de cualquier empleado de la org.
create policy "time_entries_insert" on public.time_entries for insert
  with check (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or (
        public.user_role_in(organization_id) = 'employee'
        and employee_id in (select id from public.employees where user_id = auth.uid())
      )
    )
  );

-- UPDATE:
--   - Empleado solo puede actualizar SU entry abierto (clock out propio).
--   - Manager+ pueden aprobar/editar cualquiera.
create policy "time_entries_update" on public.time_entries for update
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or (
        public.user_role_in(organization_id) = 'employee'
        and employee_id in (select id from public.employees where user_id = auth.uid())
        and status = 'open'  -- empleado solo modifica su entry abierto
      )
    )
  );

-- DELETE: solo admin/owner.
create policy "time_entries_delete" on public.time_entries for delete
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin')
  );

-- ----------------------------------------------------------------------------
-- Ampliar policies de employees para permitir que el employee vea SU fila
-- ----------------------------------------------------------------------------
-- La policy `employees_select` existente solo permite ver si el user pertenece
-- a la org. Esa policy ya incluye el caso del employee (que tiene membership).
-- No requiere cambios — el employee ya puede ver employees de su org via RLS
-- existente, lo cual es ok (verán nombres de colegas, normal en una empresa).
