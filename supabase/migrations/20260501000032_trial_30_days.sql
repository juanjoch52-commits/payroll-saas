-- =============================================================================
-- MyJova — TRL: período de prueba de 30 días (antes 14)
-- =============================================================================
-- Recrea handle_new_user con trial_ends_at = now() + 30 días. Resto idéntico a
-- 20260501000028_handle_new_user_subs_flag.sql. Solo afecta orgs NUEVAS; las
-- existentes conservan su trial_ends_at (ajustable desde el admin panel).
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
  v_uses_subs     boolean;
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

    -- Portal del contratista: vincular su login al subcontractor raíz.
    if v_invitation.role = 'contractor' and v_invitation.subcontractor_id is not null then
      update public.subcontractors
      set user_id = new.id
      where id = v_invitation.subcontractor_id
        and organization_id = v_invitation.organization_id
        and user_id is null;
    end if;

    update public.invitations
    set accepted_at = now()
    where id = v_invitation.id;

    return new;
  end if;

  -- Caso 2: signup creando una org nueva
  if v_org_name is null then
    return new;
  end if;

  -- Industria elegida en el signup (cast protegido → 'general' si es inválida).
  begin
    v_industry := coalesce(new.raw_user_meta_data ->> 'industry_type', 'general')::public.industry_type;
  exception when others then
    v_industry := 'general';
  end;

  -- ¿Paga a contratistas/subcontratistas? (comparación de texto: sin casts
  -- que puedan romper el alta si llega un valor raro).
  v_uses_subs := (new.raw_user_meta_data ->> 'uses_subcontractors') = 'true';

  -- Genera un slug único combinando el nombre + sufijo aleatorio.
  v_slug := lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]+', '-', 'g'))
            || '-' || substr(replace(new.id::text, '-', ''), 1, 8);

  insert into public.organizations (name, slug, owner_user_id, country, default_locale, industry_type, uses_subcontractors)
  values (
    v_org_name,
    v_slug,
    new.id,
    coalesce(new.raw_user_meta_data ->> 'country', 'US'),
    coalesce(new.raw_user_meta_data ->> 'locale', 'en'),
    v_industry,
    v_uses_subs
  )
  returning id into v_org_id;

  insert into public.memberships (organization_id, user_id, role)
  values (v_org_id, new.id, 'owner');

  -- Asigna trial del plan Esencial (30 días)
  select id into v_essential_id from public.plans where code = 'essential';

  insert into public.subscriptions (organization_id, plan_id, status, trial_ends_at)
  values (v_org_id, v_essential_id, 'trialing', now() + interval '30 days');

  return new;
end;
$$;
