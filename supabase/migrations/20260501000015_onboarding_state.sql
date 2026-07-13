-- =============================================================================
-- MyJova — Onboarding interactivo: estado por organización
-- =============================================================================
-- Guarda flags del tutorial (tour/checklist descartados) por org en un jsonb.
-- El progreso del checklist se computa en vivo de los datos reales (empleados,
-- worksites, nóminas…), aquí solo persistimos los "dismiss".
-- =============================================================================

alter table public.organizations
  add column if not exists onboarding_state jsonb not null default '{}'::jsonb;
