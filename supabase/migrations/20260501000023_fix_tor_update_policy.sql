-- =============================================================================
-- MyJova — Fix RLS: tor_update sin WITH CHECK bloqueaba cancelar solicitudes
-- =============================================================================
-- La policy "tor_update" (20260501000003_pto.sql) solo definía USING; Postgres
-- entonces aplica el USING también a la fila NUEVA. La rama de empleado exige
-- status = 'pending', así que cancelar (pending → cancelled) con el cliente de
-- usuario violaba RLS. Se separa en dos policies con USING/WITH CHECK
-- explícitos, mismo patrón que tsheet_update_employee/tsheet_update_manager
-- (20260501000022_timesheet_submissions.sql):
--   - manager+ : sin restricción de status (aprobar/rechazar/revocar)
--   - empleado : solo toca sus filas pending; la fila nueva puede quedar
--                pending (editar) o cancelled (cancelar)
-- =============================================================================

drop policy "tor_update" on public.time_off_requests;

-- Update del manager: revisar (aprobar/rechazar/revocar).
create policy "tor_update_manager" on public.time_off_requests for update
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  )
  with check (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  );

-- Update del empleado: editar o cancelar mientras esté pendiente.
create policy "tor_update_employee" on public.time_off_requests for update
  using (
    organization_id in (select public.user_org_ids())
    and employee_id in (select id from public.employees where user_id = auth.uid())
    and status = 'pending'
  )
  with check (
    organization_id in (select public.user_org_ids())
    and employee_id in (select id from public.employees where user_id = auth.uid())
    and status in ('pending', 'cancelled')
  );
