'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { requireSubcontractorsAccess } from '@/lib/auth/subcontractorsAccess'

// =============================================================================
// Server Actions — Subcontratistas (jerárquicos)
// =============================================================================

export type SubResult = { success: boolean; error?: string }

const subSchema = z.object({
  name: z.string().min(2, 'Nombre muy corto.').max(120),
  parentId: z.string().uuid().optional().or(z.literal('')),
  contactName: z.string().max(120).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
  // % de HST/GST que se agrega al subtotal del cheque (p.ej. 13 en Ontario).
  salesTaxPct: z.preprocess(
    (v) => (v === '' || v == null ? 0 : v),
    z.coerce.number().min(0).max(30),
  ),
  // Identidad fiscal — se imprime en la FACTURA del sub raíz (INV).
  businessLegalName: z.string().max(160).optional().or(z.literal('')),
  taxNumber: z.string().max(40).optional().or(z.literal('')),
  address: z.string().max(240).optional().or(z.literal('')),
})

function isManager(role: string) {
  return ['owner', 'admin', 'manager'].includes(role)
}

/** El parent propuesto no puede ser el propio sub ni un descendiente (ciclo). */
async function wouldCycle(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  subId: string,
  parentId: string,
): Promise<boolean> {
  if (subId === parentId) return true
  const { data: subs } = await supabase
    .from('subcontractors')
    .select('id, parent_id')
    .eq('organization_id', orgId)
  const byId = new Map((subs ?? []).map((s: { id: string; parent_id: string | null }) => [s.id, s]))
  let cur = byId.get(parentId)
  let hops = 0
  while (cur && cur.parent_id && hops < 20) {
    if (cur.parent_id === subId) return true
    cur = byId.get(cur.parent_id)
    hops++
  }
  return false
}

export async function createSubcontractor(input: z.input<typeof subSchema>): Promise<SubResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const lockErr = await requireSubcontractorsAccess(session.organizationId)
  if (lockErr) return lockErr
  const parsed = subSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const d = parsed.data

  const supabase = createClient()
  const { error } = await supabase.from('subcontractors').insert({
    organization_id: session.organizationId,
    name: d.name,
    parent_id: d.parentId || null,
    contact_name: d.contactName || null,
    email: d.email || null,
    phone: d.phone || null,
    sales_tax_pct: d.salesTaxPct,
    business_legal_name: d.businessLegalName || null,
    tax_number: d.taxNumber || null,
    address: d.address || null,
  })
  if (error) return { success: false, error: error.message }

  // Multitenant: al crear el primer contratista, la org "usa subcontratistas"
  // y el módulo aparece en la navegación (las orgs normales nunca lo ven).
  await supabase
    .from('organizations')
    .update({ uses_subcontractors: true })
    .eq('id', session.organizationId)
    .eq('uses_subcontractors', false)

  revalidatePath('/(app)/subcontractors', 'page')
  revalidatePath('/(app)', 'layout')
  return { success: true }
}

// -----------------------------------------------------------------------------
// Portal del contratista: invitación de acceso
// -----------------------------------------------------------------------------

const inviteContractorSchema = z.object({
  subcontractorId: z.string().uuid(),
  email: z.string().email('Email inválido.'),
})

/**
 * Invita al dueño de un contratista RAÍZ a su portal (rol 'contractor').
 * Al aceptar, subcontractors.user_id queda vinculado y entra a /my-crew:
 * ve SOLO su equipo, sus tarifas y sus liquidaciones — nunca las del resto.
 */
export async function inviteContractor(
  input: z.input<typeof inviteContractorSchema>,
): Promise<SubResult> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin'].includes(session.role)) {
    return { success: false, error: 'Solo owner/admin pueden invitar contratistas.' }
  }
  const lockErr = await requireSubcontractorsAccess(session.organizationId)
  if (lockErr) return lockErr
  const parsed = inviteContractorSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const d = parsed.data

  const supabase = createClient()
  const { data: sub } = await supabase
    .from('subcontractors')
    .select('id, name, parent_id, user_id')
    .eq('id', d.subcontractorId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()

  if (!sub) return { success: false, error: 'Contratista no encontrado.' }
  const subRow = sub as { id: string; name: string; parent_id: string | null; user_id: string | null }
  if (subRow.parent_id) {
    return { success: false, error: 'Solo los contratistas raíz (que cobran el cheque) tienen portal.' }
  }
  if (subRow.user_id) {
    return { success: false, error: 'Este contratista ya tiene una cuenta vinculada.' }
  }

  // Insertar invitación con rol contractor + vínculo al sub.
  const { data: invite, error: invErr } = await supabase
    .from('invitations')
    .insert({
      organization_id: session.organizationId,
      email: d.email,
      role: 'contractor',
      subcontractor_id: subRow.id,
      invited_by: session.userId,
    })
    .select('token')
    .single()
  if (invErr || !invite) {
    return { success: false, error: invErr?.message ?? 'No se pudo crear la invitación.' }
  }

  const admin = createAdminClient()
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/en/accept-invite?token=${(invite as { token: string }).token}`
  const { error: emailErr } = await admin.auth.admin.inviteUserByEmail(d.email, {
    redirectTo,
    data: {
      invitation_token: (invite as { token: string }).token,
      organization_id: session.organizationId,
      role: 'contractor',
      subcontractor_id: subRow.id,
    },
  })
  if (emailErr) {
    await supabase.from('invitations').delete().eq('token', (invite as { token: string }).token)
    return { success: false, error: `Error enviando email: ${emailErr.message}` }
  }

  revalidatePath('/(app)/subcontractors', 'page')
  return { success: true }
}

export async function updateSubcontractor(
  id: string,
  input: z.input<typeof subSchema>,
): Promise<SubResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const lockErr = await requireSubcontractorsAccess(session.organizationId)
  if (lockErr) return lockErr
  const parsed = subSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const d = parsed.data

  const supabase = createClient()
  if (d.parentId && (await wouldCycle(supabase, session.organizationId, id, d.parentId))) {
    return { success: false, error: 'Ese padre crearía un ciclo en la jerarquía.' }
  }

  const { error } = await supabase
    .from('subcontractors')
    .update({
      name: d.name,
      parent_id: d.parentId || null,
      contact_name: d.contactName || null,
      email: d.email || null,
      phone: d.phone || null,
      sales_tax_pct: d.salesTaxPct,
      business_legal_name: d.businessLegalName || null,
      tax_number: d.taxNumber || null,
      address: d.address || null,
    })
    .eq('id', id)
    .eq('organization_id', session.organizationId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/subcontractors', 'page')
  return { success: true }
}

export async function toggleSubcontractor(id: string, isActive: boolean): Promise<SubResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const lockErr = await requireSubcontractorsAccess(session.organizationId)
  if (lockErr) return lockErr
  const supabase = createClient()
  const { error } = await supabase
    .from('subcontractors')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('organization_id', session.organizationId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/subcontractors', 'page')
  return { success: true }
}
