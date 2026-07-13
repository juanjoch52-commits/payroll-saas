-- =============================================================================
-- MyJova — Migración G4: RLS de paystubs (empleado solo ve lo suyo)
-- =============================================================================
-- Las policies originales de payroll_items/payroll_components permitían a
-- CUALQUIER miembro de la org (incluido role='employee') leer TODOS los items
-- del org — es decir, la nómina de sus colegas. Esto las endurece:
--   - owner/admin/manager/viewer: ven toda la nómina del org (auditoría).
--   - employee: ve SOLO los items cuyo employee_id es su propia fila.
-- Mismo patrón que time_entries_select.
-- =============================================================================

drop policy if exists "payroll_items_select" on public.payroll_items;
create policy "payroll_items_select" on public.payroll_items for select
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager', 'viewer')
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );

drop policy if exists "payroll_components_select" on public.payroll_components;
create policy "payroll_components_select" on public.payroll_components for select
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager', 'viewer')
      or payroll_item_id in (
        select pi.id
        from public.payroll_items pi
        join public.employees e on e.id = pi.employee_id
        where e.user_id = auth.uid()
      )
    )
  );

-- payroll_runs: idéntico endurecimiento — el empleado solo "ve" runs que
-- contienen algún item suyo (necesario para el join del detalle del paystub).
drop policy if exists "payroll_runs_select" on public.payroll_runs;
create policy "payroll_runs_select" on public.payroll_runs for select
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager', 'viewer')
      or id in (
        select pi.payroll_run_id
        from public.payroll_items pi
        join public.employees e on e.id = pi.employee_id
        where e.user_id = auth.uid()
      )
    )
  );
