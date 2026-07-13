-- =============================================================================
-- MyJova — Migración G0a: Industria / área de trabajo por organización
-- =============================================================================
-- Añade el tipo de industria a cada organización. NO cambia lógica fiscal:
-- solo alimenta presets/sugerencias de UX (esquemas de pago por defecto,
-- sugerir kiosko/worksites/geofence/propinas/producción).
--
-- El enum y la columna se crean en el mismo archivo: la regla de
-- "ALTER TYPE ... ADD VALUE en migración aislada" solo aplica cuando se
-- AÑADEN valores a un enum existente, no al crear uno nuevo.
-- =============================================================================

create type public.industry_type as enum (
  'general',
  'construction',
  'restaurant',
  'retail',
  'cleaning',
  'landscaping',
  'manufacturing',
  'healthcare',
  'transportation'
);

alter table public.organizations
  add column industry_type public.industry_type not null default 'general';

comment on column public.organizations.industry_type is
  'Industria del tenant. Conduce presets de UX (no afecta cálculo de impuestos).';
