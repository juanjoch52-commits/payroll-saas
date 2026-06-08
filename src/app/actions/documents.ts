'use server'

import { headers } from 'next/headers'
import { createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'

// =============================================================================
// Server Actions — Documentos + firma electrónica
// =============================================================================

function isManager(role: string) {
  return ['owner', 'admin', 'manager'].includes(role)
}

export type DocResult = { success: boolean; error?: string }

const uploadSchema = z.object({
  name: z.string().min(1).max(120),
  kind: z
    .enum(['offer_letter', 'handbook', 'policy', 'tax_form', 'id_doc', 'contract', 'other'])
    .default('other'),
  employeeId: z.string().uuid().optional().or(z.literal('')),
  requiresSignature: z.coerce.boolean().default(false),
})

export async function uploadDocument(formData: FormData): Promise<DocResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const parsed = uploadSchema.safeParse({
    name: formData.get('name'),
    kind: formData.get('kind') ?? 'other',
    employeeId: formData.get('employeeId') ?? '',
    requiresSignature: formData.get('requiresSignature') ?? false,
  })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const d = parsed.data
  const supabase = createClient()

  const { data: doc, error } = await supabase
    .from('documents')
    .insert({
      organization_id: session.organizationId,
      employee_id: d.employeeId || null,
      name: d.name,
      kind: d.kind,
      requires_signature: d.requiresSignature,
      uploaded_by: session.userId,
    })
    .select('id')
    .single()
  if (error || !doc) return { success: false, error: error?.message ?? 'No se pudo crear.' }

  const file = formData.get('file') as File | null
  if (file && file.size > 0) {
    const ext = (file.name.split('.').pop() || 'pdf').toLowerCase()
    const path = `${session.organizationId}/${(doc as { id: string }).id}/file.${ext}`
    try {
      const admin = createAdminClient()
      const { error: upErr } = await admin.storage
        .from('documents')
        .upload(path, file, { contentType: file.type, upsert: true })
      if (!upErr) {
        await admin.from('documents').update({ storage_path: path }).eq('id', (doc as { id: string }).id)
      }
    } catch {
      /* sin service role: el documento queda sin archivo */
    }
  }
  revalidatePath('/(app)/documents', 'page')
  return { success: true }
}

export async function getDocumentUrl(
  docId: string,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const session = await requireSession('/en/login')
  const supabase = createClient()
  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', docId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  if (!doc) return { success: false, error: 'Documento no encontrado.' }
  const path = (doc as { storage_path: string | null }).storage_path
  if (!path) return { success: false, error: 'Este documento no tiene archivo.' }
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.storage.from('documents').createSignedUrl(path, 300)
    if (error || !data) return { success: false, error: 'No se pudo generar el enlace.' }
    return { success: true, url: data.signedUrl }
  } catch {
    return { success: false, error: 'Servidor sin configurar.' }
  }
}

export async function signDocument(
  docId: string,
  signedName: string,
  signatureBase64?: string,
): Promise<DocResult> {
  const session = await requireSession('/en/login')
  const supabase = createClient()
  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', session.userId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  if (!emp) return { success: false, error: 'No autorizado.' }
  if (!signedName.trim()) return { success: false, error: 'Escribe tu nombre.' }

  const { data: doc } = await supabase
    .from('documents')
    .select('id')
    .eq('id', docId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  if (!doc) return { success: false, error: 'Documento no encontrado.' }
  const empId = (emp as { id: string }).id

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return { success: false, error: 'Servidor sin configurar.' }
  }

  const signedAt = new Date().toISOString()
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const contentHash = createHash('sha256')
    .update(`${docId}|${empId}|${signedName.trim()}|${signedAt}`)
    .digest('hex')

  let signaturePath: string | null = null
  if (signatureBase64) {
    signaturePath = `${session.organizationId}/${docId}/sig-${empId}.png`
    await admin.storage
      .from('documents')
      .upload(signaturePath, Buffer.from(signatureBase64, 'base64'), {
        contentType: 'image/png',
        upsert: true,
      })
  }

  const { error } = await admin.from('document_signatures').upsert(
    {
      organization_id: session.organizationId,
      document_id: docId,
      employee_id: empId,
      signed_name: signedName.trim(),
      signature_path: signaturePath,
      signed_at: signedAt,
      ip,
      content_hash: contentHash,
    },
    { onConflict: 'document_id,employee_id' },
  )
  if (error) return { success: false, error: error.message }
  revalidatePath('/(employee)', 'layout')
  return { success: true }
}

export async function deleteDocument(docId: string): Promise<DocResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const supabase = createClient()
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', docId)
    .eq('organization_id', session.organizationId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/documents', 'page')
  return { success: true }
}
