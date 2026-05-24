-- =============================================================================
-- MyJova — Migración 19: Storage bucket time-photos
-- =============================================================================
-- Bucket privado para las fotos de clock in/out.
-- Path: {org_id}/{employee_id}/{entry_id}-{in|out}.jpg
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'time-photos',
  'time-photos',
  false,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Policies
-- ----------------------------------------------------------------------------
-- Path: {org_id}/{employee_id}/{filename}
-- folder[1] = org_id
-- folder[2] = employee_id

-- SELECT: cualquier miembro de la org puede leer las fotos de su org.
-- Restringimos por org_id solamente (no validamos por employee_id porque
-- los manager+ deben poder ver TODAS las fotos de su org).
create policy "time_photos_select_own_org" on storage.objects for select
  using (
    bucket_id = 'time-photos'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
  );

-- INSERT: el employee puede subir SU PROPIA foto (path tiene su employee_id),
-- O manager+ puede subir en nombre de cualquier empleado.
create policy "time_photos_insert_own_or_manager" on storage.objects for insert
  with check (
    bucket_id = 'time-photos'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
    and (
      public.user_role_in((storage.foldername(name))[1]::uuid) in ('owner', 'admin', 'manager')
      or (
        public.user_role_in((storage.foldername(name))[1]::uuid) = 'employee'
        and (storage.foldername(name))[2]::uuid in (
          select id from public.employees where user_id = auth.uid()
        )
      )
    )
  );

-- DELETE: solo admin/owner.
create policy "time_photos_delete_admin" on storage.objects for delete
  using (
    bucket_id = 'time-photos'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
    and public.user_role_in((storage.foldername(name))[1]::uuid) in ('owner', 'admin')
  );
