-- =============================================================================
-- MyJova — Migración 20: Actualizar handle_new_user para empleados invitados
-- =============================================================================
-- Cuando alguien acepta una invitación de tipo "employee" + tiene un employee_id
-- en metadata, vincular employees.user_id a su nuevo auth.users.id.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_name        text;
  v_org_id          uuid;
  v_essential_id    uuid;
  v_invite_token    text;
  v_invitation      public.invitations%rowtype;
  v_employee_id     uuid;
  v_slug            text;
begin
  v_org_name     := new.raw_user_meta_data ->> 'pending_org_name';
  v_invite_token := new.raw_user_meta_data ->> 'invitation_token';
  v_employee_id  := nullif(new.raw_user_meta_data ->> 'employee_id', '')::uuid;

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
    values (v_invitation.organization_id, new.id, v_invitation.role)
    on conflict (organization_id, user_id) do nothing;

    -- Si es employee y la invitación incluyó employee_id → vincular
    if v_invitation.role = 'employee' and v_employee_id is not null then
      update public.employees
      set user_id = new.id
      where id = v_employee_id
        and organization_id = v_invitation.organization_id;
    end if;

    update public.invitations
    set accepted_at = now()
    where id = v_invitation.id;

    return new;
  end if;

  -- Caso 2: signup creando una org nueva (owner)
  if v_org_name is null then
    return new;  -- usuario huérfano sin org; UI lo manda a crear/aceptar
  end if;

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

  select id into v_essential_id from public.plans where code = 'essential';

  insert into public.subscriptions (organization_id, plan_id, status, trial_ends_at)
  values (v_org_id, v_essential_id, 'trialing', now() + interval '14 days');

  return new;
end;
$$;

-- El trigger ya existe (on_auth_user_created from migración 11). No se recrea
-- porque ya apunta a la función pública handle_new_user(), que ahora tiene
-- el nuevo body.
