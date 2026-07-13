-- =============================================================================
-- MyJova — H3: Documentos + firma electrónica (onboarding)
-- =============================================================================
-- El manager sube documentos (carta de oferta, manual, políticas, W-4/I-9 en
-- PDF) y los asigna a un empleado o a toda la org. Los que requieren firma se
-- convierten en las "tareas de onboarding" del empleado. La firma electrónica
-- guarda nombre + imagen de firma + sello (hash, fecha, IP).
--
-- El bucket 'documents' es PRIVADO y se accede solo vía Server Actions con
-- service role (los documentos son sensibles).
-- =============================================================================

create type public.document_kind as enum (
  'offer_letter', 'handbook', 'policy', 'tax_form', 'id_doc', 'contract', 'other'
);

create table public.documents (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  -- employee_id null = documento para TODA la org
  employee_id        uuid references public.employees(id) on delete cascade,
  name               text not null,
  kind               public.document_kind not null default 'other',
  storage_path       text,                 -- en bucket 'documents'; null = solo acuse/firma
  requires_signature boolean not null default false,
  uploaded_by        uuid references auth.users(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index idx_documents_org on public.documents(organization_id);
create index idx_documents_emp on public.documents(employee_id);
create trigger trg_documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

create table public.document_signatures (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id     uuid not null references public.documents(id) on delete cascade,
  employee_id     uuid not null references public.employees(id) on delete cascade,
  signed_name     text not null,
  signature_path  text,                  -- imagen de la firma (canvas) en bucket
  signed_at       timestamptz not null default now(),
  ip              text,
  content_hash    text,                  -- sha256(docId|empId|name|signed_at)
  unique (document_id, employee_id)
);
create index idx_doc_sig_doc on public.document_signatures(document_id);
create index idx_doc_sig_emp on public.document_signatures(employee_id);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.documents enable row level security;
create policy "documents_select" on public.documents for select
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or employee_id is null
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );
create policy "documents_write" on public.documents for all
  using (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager'))
  with check (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager'));

alter table public.document_signatures enable row level security;
create policy "doc_sig_select" on public.document_signatures for select
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );
-- Las firmas se insertan vía service role (Server Action), pero permitimos al
-- empleado insertar la suya por seguridad.
create policy "doc_sig_insert" on public.document_signatures for insert
  with check (
    organization_id in (select public.user_org_ids())
    and employee_id in (select id from public.employees where user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- Bucket privado (solo service role lo toca vía Server Actions)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  20971520,  -- 20 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
