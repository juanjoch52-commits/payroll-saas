-- =============================================================================
-- MyJova — H12: SSO (OAuth) — org por defecto para usuarios externos
-- =============================================================================
-- Con SSO (Google/Microsoft) un usuario nuevo NO pasa por el form de signup, así
-- que no llega `pending_org_name` en raw_user_meta_data. Sin esto el trigger
-- dejaba al usuario sin organización (estado roto). Aquí: si el alta viene de un
-- proveedor externo (provider != 'email') y no hay org ni invitación, se crea
-- una org personal por defecto derivada del nombre/email.
--
-- Resto de la función idéntico a 20260401000005_handle_new_user_industry.sql.
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
  v_industry      public.industry_type;
  v_provider      text;
begin
  v_org_name     := new.raw_user_meta_data ->> 'pending_org_name';
  v_invite_token := new.raw_user_meta_data ->> 'invitation_token';
  v_provider     := coalesce(new.raw_app_meta_data ->> 'provider', 'email');

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

  -- Caso 2: signup creando una org nueva.
  -- Si no hay org name pero el alta viene de un proveedor externo (SSO), generamos
  -- un nombre por defecto para que el usuario no quede sin tenant.
  if v_org_name is null then
    if v_provider <> 'email' then
      v_org_name := coalesce(
        nullif(new.raw_user_meta_data ->> 'full_name', ''),
        nullif(new.raw_user_meta_data ->> 'name', ''),
        split_part(new.email, '@', 1)
      ) || '''s organization';
    else
      return new;
    end if;
  end if;

  -- Industria elegida en el signup (cast protegido → 'general' si es inválida).
  begin
    v_industry := coalesce(new.raw_user_meta_data ->> 'industry_type', 'general')::public.industry_type;
  exception when others then
    v_industry := 'general';
  end;

  -- Genera un slug único combinando el nombre + sufijo aleatorio.
  v_slug := lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]+', '-', 'g'))
            || '-' || substr(replace(new.id::text, '-', ''), 1, 8);

  insert into public.organizations (name, slug, owner_user_id, country, default_locale, industry_type)
  values (
    v_org_name,
    v_slug,
    new.id,
    coalesce(new.raw_user_meta_data ->> 'country', 'US'),
    coalesce(new.raw_user_meta_data ->> 'locale', 'en'),
    v_industry
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
