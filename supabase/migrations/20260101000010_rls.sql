-- =============================================================================
-- MyJova — Migración 10: Row Level Security (RLS) — EL ARCHIVO MÁS CRÍTICO
-- =============================================================================
-- Define el aislamiento multi-tenant a nivel de base de datos. Sin estas
-- policies, un usuario podría leer los datos de OTRA organización si la
-- query app-level fallara.
--
-- Patrón general por tabla con `organization_id`:
--   - SELECT  : permitido si org_id ∈ user_org_ids()
--   - INSERT  : permitido si rol del user es owner|admin|manager
--   - UPDATE  : igual a INSERT
--   - DELETE  : permitido si rol es owner|admin (más restrictivo)
--
-- `plans`, `jurisdictions`, `tax_brackets` son catálogos públicos — ya tienen
-- policy de select all en sus migraciones respectivas.
-- =============================================================================

-- =============================================================================
-- organizations
-- =============================================================================
alter table public.organizations enable row level security;

create policy "organizations_select" on public.organizations for select
  using (id in (select public.user_org_ids()));

create policy "organizations_insert" on public.organizations for insert
  with check (owner_user_id = auth.uid());

create policy "organizations_update" on public.organizations for update
  using (id in (select public.user_org_ids()) and public.user_role_in(id) in ('owner', 'admin'));

create policy "organizations_delete" on public.organizations for delete
  using (id in (select public.user_org_ids()) and public.user_role_in(id) = 'owner');

-- =============================================================================
-- memberships
-- =============================================================================
alter table public.memberships enable row level security;

-- Cada user ve su propia membresía, y un admin ve todas las de su org.
create policy "memberships_select" on public.memberships for select
  using (
    user_id = auth.uid()
    or organization_id in (select public.user_org_ids())
  );

create policy "memberships_insert" on public.memberships for insert
  with check (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin')
  );

create policy "memberships_update" on public.memberships for update
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin')
  );

create policy "memberships_delete" on public.memberships for delete
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin')
  );

-- =============================================================================
-- invitations
-- =============================================================================
alter table public.invitations enable row level security;

create policy "invitations_select" on public.invitations for select
  using (organization_id in (select public.user_org_ids()));

create policy "invitations_insert" on public.invitations for insert
  with check (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin')
  );

create policy "invitations_delete" on public.invitations for delete
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin')
  );

-- =============================================================================
-- subscriptions
-- =============================================================================
alter table public.subscriptions enable row level security;

create policy "subscriptions_select" on public.subscriptions for select
  using (organization_id in (select public.user_org_ids()));

-- Insert/update solo via service role (webhooks Stripe) — NO se crean policies
-- aquí. El admin client bypassa RLS.

-- =============================================================================
-- employees
-- =============================================================================
alter table public.employees enable row level security;

create policy "employees_select" on public.employees for select
  using (organization_id in (select public.user_org_ids()));

create policy "employees_insert" on public.employees for insert
  with check (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  );

create policy "employees_update" on public.employees for update
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  );

create policy "employees_delete" on public.employees for delete
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin')
  );

-- =============================================================================
-- pay_schemes
-- =============================================================================
alter table public.pay_schemes enable row level security;

create policy "pay_schemes_select" on public.pay_schemes for select
  using (organization_id in (select public.user_org_ids()));

create policy "pay_schemes_insert" on public.pay_schemes for insert
  with check (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  );

create policy "pay_schemes_update" on public.pay_schemes for update
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  );

-- =============================================================================
-- payroll_runs
-- =============================================================================
alter table public.payroll_runs enable row level security;

create policy "payroll_runs_select" on public.payroll_runs for select
  using (organization_id in (select public.user_org_ids()));

create policy "payroll_runs_insert" on public.payroll_runs for insert
  with check (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  );

create policy "payroll_runs_update" on public.payroll_runs for update
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  );

create policy "payroll_runs_delete" on public.payroll_runs for delete
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin')
  );

-- =============================================================================
-- payroll_items
-- =============================================================================
alter table public.payroll_items enable row level security;

create policy "payroll_items_select" on public.payroll_items for select
  using (organization_id in (select public.user_org_ids()));

create policy "payroll_items_insert" on public.payroll_items for insert
  with check (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  );

create policy "payroll_items_update" on public.payroll_items for update
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  );

-- =============================================================================
-- payroll_components
-- =============================================================================
alter table public.payroll_components enable row level security;

create policy "payroll_components_select" on public.payroll_components for select
  using (organization_id in (select public.user_org_ids()));

create policy "payroll_components_insert" on public.payroll_components for insert
  with check (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  );

-- =============================================================================
-- tax_forms
-- =============================================================================
alter table public.tax_forms enable row level security;

create policy "tax_forms_select" on public.tax_forms for select
  using (organization_id in (select public.user_org_ids()));

create policy "tax_forms_insert" on public.tax_forms for insert
  with check (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  );

-- =============================================================================
-- tax_filings
-- =============================================================================
alter table public.tax_filings enable row level security;

create policy "tax_filings_select" on public.tax_filings for select
  using (organization_id in (select public.user_org_ids()));

create policy "tax_filings_insert" on public.tax_filings for insert
  with check (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin')
  );

-- =============================================================================
-- integrations
-- =============================================================================
alter table public.integrations enable row level security;

create policy "integrations_select" on public.integrations for select
  using (organization_id in (select public.user_org_ids()));

create policy "integrations_all_admin" on public.integrations for all
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin')
  )
  with check (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin')
  );

-- =============================================================================
-- api_keys
-- =============================================================================
alter table public.api_keys enable row level security;

create policy "api_keys_select" on public.api_keys for select
  using (organization_id in (select public.user_org_ids()));

create policy "api_keys_all_owner" on public.api_keys for all
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) = 'owner'
  )
  with check (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) = 'owner'
  );

-- =============================================================================
-- webhook_events
-- =============================================================================
alter table public.webhook_events enable row level security;

-- Solo owners pueden ver webhooks (datos sensibles).
create policy "webhook_events_select" on public.webhook_events for select
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) = 'owner'
  );

-- Insert solo via service role (no policy aquí — admin client bypassa).

-- =============================================================================
-- audit_logs
-- =============================================================================
alter table public.audit_logs enable row level security;

-- Solo owners y admins ven los logs de su org.
create policy "audit_logs_select" on public.audit_logs for select
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin')
  );

-- Insert es controlado app-level desde Server Actions (no se crea policy
-- de insert para usuarios — el admin client maneja inserts).

-- =============================================================================
-- plans + jurisdictions ya tienen políticas en sus migraciones de creación.
-- =============================================================================
