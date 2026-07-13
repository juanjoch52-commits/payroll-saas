-- =============================================================================
-- MyJova — Candado por plan del módulo de contratistas/subcontratistas
-- =============================================================================
-- Decisión de Juan (2026-07-12): la landing vende el módulo como Premium y
-- ahora se ENFORZA. Nueva feature key `subcontractors` en plans.features:
--   - premium  → true
--   - essential / advanced → false
--
-- El gate de la app (hasSubcontractorsAccess) permite el módulo COMPLETO
-- durante el trial activo (el signup pregunta "¿pagas a subcontratistas?" y
-- la org nace con uses_subcontractors — el trial debe poder probarlo); al
-- pagar, exige plan con la feature. check_plan_feature ya respeta
-- feature_overrides, así que el platform admin puede conceder excepciones
-- por tenant sin tocar código.
-- =============================================================================

update public.plans
set features = features || jsonb_build_object('subcontractors', true)
where code = 'premium';

update public.plans
set features = features || jsonb_build_object('subcontractors', false)
where code in ('essential', 'advanced');
