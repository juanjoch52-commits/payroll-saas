-- =============================================================================
-- Realtime en notifications — la campana recibe INSERTs en vivo.
-- =============================================================================
-- Antes era un paso manual del dashboard (HANDOFF §2). Como migración, todo
-- entorno nuevo lo trae de fábrica. Idempotente: solo añade la tabla a la
-- publicación si no está ya.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
