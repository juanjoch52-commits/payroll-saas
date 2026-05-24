'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'

// =============================================================================
// Server Actions — Invitations
// =============================================================================
// El admin envía un email vía Supabase Auth Admin API. Cuando el invitado
// completa el signup, el trigger SQL `handle_new_user` (migración 20) procesa
// el token de invitación y crea la membership.
// =============================================================================

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'manager', 'employee', 'viewer']).default('employee'),
  employeeId: z.string().uuid().optional().or(z.literal('')),
})

export type InviteResult =
  | { success: true; token: string }
  | { success: false; error: string }

export async function createInvitation(formData: FormData): Promise<InviteResult> {
  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role') ?? 'employee',
    employeeId: formData.get('employeeId') ?? '',
  })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const session = await requireSession('/en/login')
  if (!['owner', 'admin'].includes(session.role)) {
    return { success: false, error: 'No tienes permiso para invitar.' }
  }

  const supabase = createClient()
  const admin = createAdminClient()

  // 1) Insertar invitación (genera token aleatorio via default)
  const { data: invite, error: invErr } = await supabase
    .from('invitations')
    .insert({
      organization_id: session.organizationId,
      email: parsed.data.email,
      role: parsed.data.role,
      invited_by: session.userId,
    })
    .select('token')
    .single()

  if (invErr || !invite) return { success: false, error: invErr?.message ?? 'No se pudo crear la invitación.' }

  // 2) Mandar email vía Supabase Auth Admin API
  //    El user va a recibir un link a /auth/callback?next=/[locale]/accept-invite?token=xxx
  //    Cuando complete signup, el trigger usa el token de raw_user_meta_data.
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/en/accept-invite?token=${invite.token}`

  const { error: emailErr } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo,
    data: {
      invitation_token: invite.token,
      organization_id: session.organizationId,
      role: parsed.data.role,
      employee_id: parsed.data.employeeId || null,
    },
  })

  if (emailErr) {
    // Si email falla, eliminar la invitación huérfana
    await supabase.from('invitations').delete().eq('token', invite.token)
    return { success: false, error: `Error enviando email: ${emailErr.message}` }
  }

  revalidatePath('/(app)/employees', 'layout')
  return { success: true, token: invite.token }
}

/**
 * Endpoint llamado desde la página /accept-invite cuando un user ya logged-in
 * llega con un token. Si el user es nuevo (signup), el trigger SQL lo procesa
 * automáticamente.
 */
export async function acceptInvitation(
  token: string,
): Promise<{ success: boolean; error?: string; organizationId?: string }> {
  const session = await requireSession('/en/login')
  const supabase = createClient()

  const { data: invite } = await supabase
    .from('invitations')
    .select('id, organization_id, role, email, accepted_at, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (!invite) return { success: false, error: 'Invitación no encontrada.' }
  if (invite.accepted_at) return { success: false, error: 'Invitación ya usada.' }
  if (new Date(invite.expires_at) < new Date()) {
    return { success: false, error: 'Invitación expirada.' }
  }
  if (session.email.toLowerCase() !== invite.email.toLowerCase()) {
    return {
      success: false,
      error: 'Esta invitación es para otro email. Cierra sesión y crea cuenta con el email correcto.',
    }
  }

  // Crear membership (idempotente con on conflict)
  const admin = createAdminClient()
  const { error: memErr } = await admin
    .from('memberships')
    .insert({
      organization_id: invite.organization_id,
      user_id: session.userId,
      role: invite.role,
    })
  if (memErr && !memErr.message.includes('duplicate')) {
    return { success: false, error: memErr.message }
  }

  await admin.from('invitations').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)

  return { success: true, organizationId: invite.organization_id }
}
