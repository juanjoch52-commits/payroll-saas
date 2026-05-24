-- =============================================================================
-- MyJova — Migración: Notifications
-- =============================================================================
-- Sistema unificado de notificaciones multi-canal:
--   - in-app: tabla `notifications` con realtime para el bell del header
--   - email: enviado vía Resend desde Server Action
--   - sms: enviado vía Twilio desde Server Action
--   - push: enviado vía web-push (VAPID) desde Server Action
--
-- Las preferencias por user × tipo × canal viven en notification_preferences.
-- El dispatch() (src/lib/notifications/dispatch.ts) lee preferences y fan-out
-- a los canales habilitados, con dedupe por dedupe_key.
-- =============================================================================

create type public.notification_type as enum (
  'welcome',
  'invite',
  'payroll_ready',
  'payroll_failed',
  'payroll_approved',
  'time_entry_pending',
  'time_entry_approved',
  'time_entry_rejected',
  'clock_anomaly',
  'tax_form_ready',
  'broadcast',
  'support_reply',
  'payment_failed',
  'plan_changed',
  'trial_ending'
);

create type public.notification_channel as enum ('inapp', 'email', 'sms', 'push');

-- ---------------- notifications (in-app feed) ----------------
create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  type            public.notification_type not null,
  title           text not null,
  body            text not null,
  data            jsonb not null default '{}'::jsonb,
  cta_label       text,
  cta_url         text,
  dedupe_key      text,  -- prevent dupes across channels for same logical event
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_notifications_user_unread on public.notifications(user_id, created_at desc) where read_at is null;
create index idx_notifications_user_all on public.notifications(user_id, created_at desc);
create unique index idx_notifications_dedupe on public.notifications(user_id, dedupe_key) where dedupe_key is not null;

alter table public.notifications enable row level security;
create policy "notifications_user_read" on public.notifications for select using (user_id = auth.uid());
create policy "notifications_user_update" on public.notifications for update using (user_id = auth.uid());
-- Inserts only from service role (server actions); no insert policy needed.

-- ---------------- preferences ----------------
create table public.notification_preferences (
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        public.notification_type not null,
  channel     public.notification_channel not null,
  enabled     boolean not null default true,
  updated_at  timestamptz not null default now(),
  primary key (user_id, type, channel)
);

alter table public.notification_preferences enable row level security;
create policy "notifprefs_user_all" on public.notification_preferences for all using (user_id = auth.uid());

-- ---------------- web push subscriptions ----------------
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_used_at timestamptz
);

create index idx_push_subs_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;
create policy "push_subs_user_all" on public.push_subscriptions for all using (user_id = auth.uid());

-- ---------------- helper RPC: count unread ----------------
create or replace function public.notifications_unread_count(p_user_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.notifications
  where user_id = p_user_id and read_at is null;
$$;

grant execute on function public.notifications_unread_count(uuid) to authenticated;

-- ---------------- Enable Realtime ----------------
-- MUST be enabled in Supabase Dashboard → Database → Replication → notifications
-- (cannot be set from SQL in self-hosted; managed in dashboard)
