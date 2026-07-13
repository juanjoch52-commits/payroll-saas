-- =============================================================================
-- MyJova — RPC admin_list_users (panel /admin: control de usuarios)
-- =============================================================================
-- Lista usuarios de auth.users (email, último login, confirmación, metadata)
-- con sus memberships/orgs agregadas — SOLO para platform admins.
--
-- Seguridad: SECURITY DEFINER para poder leer auth.users, pero el WHERE
-- exige public.is_platform_admin() — cualquier otro caller recibe 0 filas.
-- Se llama con el cliente del USUARIO (no service role): auth.uid()/jwt del
-- admin son los que pasan el guard. Sin revokes (lección de ...037: no tocar
-- grants de helpers SECURITY DEFINER).
--
-- p_search  → filtro ilike sobre email (opcional).
-- p_org_id  → solo miembros de esa org (para el detalle de tenant).
-- total_count → count(*) over() (mismo filtro, pre-limit) para paginación.
-- =============================================================================

create or replace function public.admin_list_users(
  p_search text default null,
  p_org_id uuid default null,
  p_limit  int  default 100,
  p_offset int  default 0
)
returns table (
  user_id            uuid,
  email              text,
  created_at         timestamptz,
  last_sign_in_at    timestamptz,
  email_confirmed_at timestamptz,
  full_name          text,
  memberships        jsonb,
  total_count        bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at,
    coalesce(
      u.raw_user_meta_data ->> 'full_name',
      u.raw_user_meta_data ->> 'name'
    )::text,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'organization_id', m.organization_id,
          'org_name', o.name,
          'role', m.role
        )
        order by m.created_at
      ) filter (where m.user_id is not null),
      '[]'::jsonb
    ),
    count(*) over ()
  from auth.users u
  left join public.memberships m on m.user_id = u.id
  left join public.organizations o on o.id = m.organization_id
  where public.is_platform_admin()
    and (p_search is null or p_search = '' or u.email ilike '%' || p_search || '%')
    and (
      p_org_id is null
      or exists (
        select 1 from public.memberships m2
        where m2.user_id = u.id and m2.organization_id = p_org_id
      )
    )
  group by u.id
  order by u.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0)
$$;
