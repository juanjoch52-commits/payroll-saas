-- =============================================================================
-- MyJova — Migración G1a: Añade 'piecerate' al enum pay_scheme_type
-- =============================================================================
-- Pago por producción / a destajo: se paga por unidad producida (camisas
-- planchadas, cajas empacadas, metros instalados...). Común en manufactura,
-- agricultura, limpieza y construcción a destajo.
--
-- IMPORTANTE: `ALTER TYPE ... ADD VALUE` va SOLO en este archivo, sin usarse
-- en la misma migración (Postgres no permite usar un valor de enum recién
-- añadido dentro de la misma transacción). El uso (tabla, columnas) va en la
-- migración siguiente. Mismo precedente que 20260201000001_employee_role.sql.
-- =============================================================================

alter type public.pay_scheme_type add value if not exists 'piecerate' after 'commission';
