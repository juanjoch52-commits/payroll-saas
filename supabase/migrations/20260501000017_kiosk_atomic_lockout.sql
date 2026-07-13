-- =============================================================================
-- MyJova — Kiosk: lockout de PIN atómico (cierra el race TOCTOU)
-- =============================================================================
-- Antes: kioskCheckIn contaba fallos y luego insertaba el intento en pasos
-- separados → N requests concurrentes leían count<5 antes de insertar ninguno,
-- saltándose el tope contra un PIN de 4 dígitos.
-- Ahora: esta función serializa por empleado (advisory xact lock), cuenta y
-- CONSUME el slot (inserta el intento como fallido) en una sola transacción,
-- ANTES de verificar el bcrypt. Si el PIN resulta correcto, el caller marca la
-- fila como succeeded=true. Devuelve NULL si está bloqueado.
-- =============================================================================

create or replace function public.kiosk_reserve_pin_attempt(
  p_organization_id uuid,
  p_device_id       uuid,
  p_employee_id     uuid,
  p_max_fails       int default 5,
  p_window_minutes  int default 15
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fails   int;
  v_attempt uuid;
begin
  -- Serializa los intentos de ESTE empleado (se libera al terminar la tx).
  perform pg_advisory_xact_lock(hashtext(p_employee_id::text));

  select count(*) into v_fails
  from public.kiosk_pin_attempts
  where employee_id = p_employee_id
    and succeeded = false
    and created_at >= now() - make_interval(mins => p_window_minutes);

  if v_fails >= p_max_fails then
    return null; -- bloqueado: el slot NO se consume, el caller rechaza
  end if;

  insert into public.kiosk_pin_attempts (organization_id, kiosk_device_id, employee_id, succeeded)
  values (p_organization_id, p_device_id, p_employee_id, false)
  returning id into v_attempt;

  return v_attempt;
end;
$$;

-- Solo el service role la invoca (el kiosko no tiene sesión de usuario).
revoke execute on function public.kiosk_reserve_pin_attempt(uuid, uuid, uuid, int, int) from public, anon, authenticated;
