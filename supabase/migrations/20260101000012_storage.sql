-- =============================================================================
-- MyJova — Migración 12: Storage buckets para PDFs y assets
-- =============================================================================
-- Bucket `tax-forms`: privado, guarda W-2/1099/T4 generados. URL firmadas
-- por 1 hora cuando un user los descarga.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tax-forms', 'tax-forms', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Policies de Storage para tax-forms
-- -----------------------------------------------------------------------------
-- Path convention: tax-forms/<organization_id>/<year>/<form-type>-<id>.pdf
-- El primer segmento del path es el organization_id, que validamos.
create policy "tax_forms_select_own_org" on storage.objects for select
  using (
    bucket_id = 'tax-forms'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
  );

create policy "tax_forms_insert_own_org" on storage.objects for insert
  with check (
    bucket_id = 'tax-forms'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
    and public.user_role_in((storage.foldername(name))[1]::uuid) in ('owner', 'admin', 'manager')
  );

create policy "tax_forms_delete_own_org" on storage.objects for delete
  using (
    bucket_id = 'tax-forms'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
    and public.user_role_in((storage.foldername(name))[1]::uuid) in ('owner', 'admin')
  );
