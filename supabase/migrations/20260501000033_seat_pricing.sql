-- =============================================================================
-- BILL2 — Modelo de cobro: base + por-trabajador-activo (aprobado 2026-07-12)
-- =============================================================================
-- Antes: flat con topes ($49/99/199, caps 10/50/∞).
-- Ahora: cada plan cobra una BASE mensual + un precio POR TRABAJADOR ACTIVO
-- (empleados con status = 'active'; la cantidad se sincroniza como "seat"
-- licensed en la suscripción de Stripe).
--
-- PRECIOS PLACEHOLDER — Juan los ajusta aquí Y en src/lib/pricing/plans.ts
-- Y al crear los precios en Stripe (los 3 sitios deben coincidir):
--   essential: $29 base + $5/worker
--   advanced:  $59 base + $7/worker
--   premium:   $99 base + $10/worker
--
-- max_employees queda NULL en todos los planes: ya no hay tope duro; el costo
-- escala solo. monthly_price_cents se conserva (= base) porque el admin panel
-- lo muestra como referencia.
-- =============================================================================

alter table public.plans
  add column if not exists base_price_cents int not null default 0
    check (base_price_cents >= 0);

alter table public.plans
  add column if not exists per_worker_price_cents int not null default 0
    check (per_worker_price_cents >= 0);

update public.plans set base_price_cents = 2900, per_worker_price_cents = 500
  where code = 'essential';
update public.plans set base_price_cents = 5900, per_worker_price_cents = 700
  where code = 'advanced';
update public.plans set base_price_cents = 9900, per_worker_price_cents = 1000
  where code = 'premium';

update public.plans set monthly_price_cents = base_price_cents
  where base_price_cents > 0;

update public.plans set max_employees = null;
