-- =============================================================================
-- MyJova — H1: nuevos valores del enum notification_type
-- =============================================================================
-- ALTER TYPE ADD VALUE va en migración aislada (no se usan en este archivo).
-- Usados por dispatch.ts: horario publicado, swaps, y tiempo libre (H2).
-- =============================================================================

alter type public.notification_type add value if not exists 'schedule_published';
alter type public.notification_type add value if not exists 'shift_swap';
alter type public.notification_type add value if not exists 'time_off_request';
alter type public.notification_type add value if not exists 'time_off_decision';
