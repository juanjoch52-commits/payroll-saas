-- =============================================================================
-- MyJova — Migración 11: Triggers de Auth + JWT Hook
-- =============================================================================
-- Cuando un user nuevo se registra en Supabase Auth, este trigger crea
-- automáticamente:
--   1. Una organization con el nombre que pasó en `raw_user_meta_data`.
--   2. Una membership con role='owner'.
--   3. Una subscription en estado 'trialing' del plan 'essential'.
--
-- Si el signup viene de una invitación (raw_user_meta_data tiene `invitation_token`),
-- se procesa el accept en vez de crear org nueva.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_name      text;
  v_org_id        uuid;
  v_essential_id  uuid;
  v_invite_token  text;
  v_invitation    public.invitations%rowtype;
  v_slug          text;
begin
  v_org_name     := new.raw_user_meta_data ->> 'pending_org_name';
  v_invite_token := new.raw_user_meta_data ->> 'invitation_token';

  -- Caso 1: signup via invitación
  if v_invite_token is not null then
    select * into v_invitation
    from public.invitations
    where token = v_invite_token
      and accepted_at is null
      and expires_at > now()
      and lower(email) = lower(new.email);

    if not found then
      raise warning 'Invitation token invalid or expired for user %', new.id;
      return new;
    end if;

    insert into public.memberships (organization_id, user_id, role)
    values (v_invitation.organization_id, new.id, v_invitation.role);

    update public.invitations
    set accepted_at = now()
    where id = v_invitation.id;

    return new;
  end if;

  -- Caso 2: signup creando una org nueva
  if v_org_name is null then
    -- No hay org pendiente ni invitación. El user queda sin org;
    -- la app debe redirigirlo a crear o aceptar una.
    return new;
  end if;

  -- Genera un slug único combinando el nombre + sufijo aleatorio.
  v_slug := lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]+', '-', 'g'))
            || '-' || substr(replace(new.id::text, '-', ''), 1, 8);

  insert into public.organizations (name, slug, owner_user_id, country, default_locale)
  values (
    v_org_name,
    v_slug,
    new.id,
    coalesce(new.raw_user_meta_data ->> 'country', 'US'),
    coalesce(new.raw_user_meta_data ->> 'locale', 'en')
  )
  returning id into v_org_id;

  insert into public.memberships (organization_id, user_id, role)
  values (v_org_id, new.id, 'owner');

  -- Asigna trial del plan Esencial (14 días)
  select id into v_essential_id from public.plans where code = 'essential';

  insert into public.subscriptions (organization_id, plan_id, status, trial_ends_at)
  values (v_org_id, v_essential_id, 'trialing', now() + interval '14 days');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =============================================================================
-- JWT Hook: añade `active_org_id` a los claims del token
-- =============================================================================
-- Configuración requerida en Supabase Dashboard:
--   Authentication → Hooks → Custom Access Token (Postgres)
--   Function: public.custom_access_token_hook
--
-- El claim `user_metadata.active_org_id` queda accesible en RLS via
--   (current_setting('request.jwt.claims', true)::jsonb #>> '{user_metadata,active_org_id}')
--
-- En MVP no lo usamos directamente en policies (usamos user_org_ids() que
-- es más simple), pero el claim sirve para que el front sepa cuál es la
-- org "activa" de un user que pertenece a varias.
-- =============================================================================
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  v_claims jsonb;
  v_org_id uuid;
begin
  v_claims := event -> 'claims';

  -- Toma la primera membership (la más antigua) como org activa por defecto.
  -- El front puede cambiarla con `supabase.auth.updateUser({ data: { active_org_id } })`.
  select m.organization_id into v_org_id
  from public.memberships m
  where m.user_id = (event ->> 'user_id')::uuid
  order by m.created_at asc
  limit 1;

  if v_org_id is not null then
    v_claims := jsonb_set(
      v_claims,
      '{user_metadata,active_org_id}',
      to_jsonb(v_org_id::text)
    );
  end if;

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

-- Permite que Supabase ejecute el hook como `supabase_auth_admin`.
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
grant all on table public.memberships to supabase_auth_admin;
grant select on table public.memberships to authenticated;
