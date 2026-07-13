-- =============================================================================
-- MyJova — Migración 13: Añadir rol 'employee' al enum membership_role
-- =============================================================================
-- Los trabajadores que hacen clock in/out son members de la org con
-- role='employee'. Solo ven sus propios datos (sus time_entries, sus pay stubs).
-- =============================================================================

-- Postgres requiere COMMIT entre alter type add value y su uso, por eso
-- esta migración solo añade el valor; el uso (policies, server actions) está
-- en migraciones posteriores que corren en transacciones separadas.
alter type public.membership_role add value if not exists 'employee' before 'viewer';
