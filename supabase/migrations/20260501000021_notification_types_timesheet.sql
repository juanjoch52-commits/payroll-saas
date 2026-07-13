-- =============================================================================
-- MyJova — TS-1a: nuevos tipos de notificación para cierre de semana
-- =============================================================================
-- ALTER TYPE ... ADD VALUE va en archivo propio (convención del repo): el valor
-- nuevo no puede usarse en la misma transacción que lo crea.
-- =============================================================================

alter type public.notification_type add value if not exists 'timesheet_submitted';
alter type public.notification_type add value if not exists 'timesheet_decision';
