-- =============================================================================
-- MyJova — BRK: almuerzo no pagado automático + correcciones manuales de fichaje
-- =============================================================================
-- 1) Política de descanso por organización: descontar N minutos de almuerzo
--    no pagado cuando el turno alcanza un umbral (medio día no descuenta).
--    El empleado puede marcar "no tomé almuerzo" al salir → break_waived
--    (flageado para el manager, que puede corregir con editTimeEntry).
-- 2) Entries manuales: el empleado reporta un turno olvidado (manual_kind
--    'full') o corrige un clock-out olvidado ('clock_out'), siempre con motivo
--    y quedando 'pending' para aprobación normal del manager.
-- 3) Fix RLS de time_entries_update: sin WITH CHECK propio, Postgres aplica el
--    USING también a la fila NUEVA, y `status='open'` bloqueaba el clock-out
--    del empleado (open→pending). Se separa en policies de manager y empleado.
-- =============================================================================

alter table public.organizations
  add column break_auto_deduct_minutes int not null default 0
    check (break_auto_deduct_minutes between 0 and 120),
  add column break_auto_deduct_threshold_minutes int not null default 360
    check (break_auto_deduct_threshold_minutes between 0 and 720);

alter table public.time_entries
  add column break_waived boolean not null default false,
  add column manual_kind text check (manual_kind in ('full', 'clock_out')),
  add column manual_reason text;

-- -----------------------------------------------------------------------------
-- RLS: reemplaza time_entries_update (bug USING-como-WITH-CHECK)
-- -----------------------------------------------------------------------------
drop policy "time_entries_update" on public.time_entries;

create policy "time_entries_update_manager" on public.time_entries for update
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  )
  with check (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  );

-- Empleado: solo SU entry abierta (fila vieja) y solo puede dejarla abierta o
-- cerrarla a pending (clock out normal o corrección de salida olvidada).
create policy "time_entries_update_employee" on public.time_entries for update
  using (
    organization_id in (select public.user_org_ids())
    and employee_id in (select id from public.employees where user_id = auth.uid())
    and status = 'open'
  )
  with check (
    organization_id in (select public.user_org_ids())
    and employee_id in (select id from public.employees where user_id = auth.uid())
    and status in ('open', 'pending')
  );
