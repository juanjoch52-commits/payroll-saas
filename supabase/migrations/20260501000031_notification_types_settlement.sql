-- =============================================================================
-- MyJova — REC-2: tipos de notificación para el contratista
-- =============================================================================
-- settlement_ready: la empresa aprobó una nómina que incluye a su equipo → su
-- cheque está autorizado (email con totales). settlement_paid: el cheque fue
-- marcado como pagado. ALTER TYPE ... ADD VALUE en archivo propio (convención).
-- =============================================================================

alter type public.notification_type add value if not exists 'settlement_ready';
alter type public.notification_type add value if not exists 'settlement_paid';
