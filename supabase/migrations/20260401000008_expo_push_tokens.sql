-- =============================================================================
-- MyJova — Migración G11: tokens de push de la app móvil (Expo)
-- =============================================================================
-- Sibling de push_subscriptions (web-push/VAPID). El dispatcher de
-- notificaciones envía al canal `push` por AMBOS transportes.
-- =============================================================================

create table public.expo_push_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  expo_token    text not null unique,
  device_name   text,
  platform      text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);

create index idx_expo_push_tokens_user on public.expo_push_tokens(user_id);

alter table public.expo_push_tokens enable row level security;

-- El usuario gestiona sus propios tokens (la app móvil registra vía REST con
-- service role, pero esto permite acceso directo seguro si se necesita).
create policy "expo_push_tokens_own" on public.expo_push_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
