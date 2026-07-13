-- =============================================================================
-- MyJova — Hardening: políticas storage.objects para el bucket 'documents'
-- =============================================================================
-- El bucket 'documents' (20260501000004) es privado y hoy se accede SOLO vía
-- service role + signed URLs. Faltaban políticas org-scoped en storage.objects
-- (las tienen 'time-photos' y 'tax-forms'). Se añaden como defensa en
-- profundidad: si algún día se lee con el cliente anon, queda acotado a la org.
-- Path: {org_id}/{doc_id}/...  → folder[1] = org_id.
-- =============================================================================

create policy "documents_select_own_org" on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
  );

create policy "documents_write_manager" on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
    and public.user_role_in((storage.foldername(name))[1]::uuid) in ('owner', 'admin', 'manager')
  );

create policy "documents_delete_admin" on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
    and public.user_role_in((storage.foldername(name))[1]::uuid) in ('owner', 'admin')
  );
