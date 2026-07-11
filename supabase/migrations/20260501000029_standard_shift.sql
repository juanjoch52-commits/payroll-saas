-- =============================================================================
-- MyJova — SFT: jornada estándar por organización (contador de turno)
-- =============================================================================
-- Minutos de la jornada "completa" (ej. 480 = 8h PAGADAS). El reloj del
-- empleado (web y app) muestra cuánto lleva, cuánto le falta y la hora
-- estimada de salida — sumando el almuerzo no pagado si la política aplica
-- (8h pagadas + 30m de almuerzo = 8h30m en sitio). 0 = contador apagado.
-- Es informativo: NO corta el turno ni bloquea el clock out.
-- =============================================================================

alter table public.organizations
  add column standard_shift_minutes int not null default 480
    check (standard_shift_minutes between 0 and 960);
