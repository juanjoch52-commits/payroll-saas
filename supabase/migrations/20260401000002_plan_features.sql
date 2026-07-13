-- =============================================================================
-- MyJova — Migración G0b: Nuevas feature flags en los planes
-- =============================================================================
-- Añade dos features al jsonb `plans.features`, consultado por
-- `check_plan_feature(org_id, key)`:
--   - payroll_piecerate      → pago por producción / a destajo (G1).
--   - quickbooks_integration → sincronización con QuickBooks Online (G9/G10).
--
-- Disponibles en Avanzado + Premium (igual que daily/commission/tax_forms).
-- Esencial queda en false. El platform admin puede sobreescribir por tenant
-- vía `feature_overrides` (migración 20260301000003).
-- =============================================================================

update public.plans
set features = features || jsonb_build_object(
  'payroll_piecerate', true,
  'quickbooks_integration', true
)
where code in ('advanced', 'premium');

update public.plans
set features = features || jsonb_build_object(
  'payroll_piecerate', false,
  'quickbooks_integration', false
)
where code = 'essential';
