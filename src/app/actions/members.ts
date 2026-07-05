'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'

// =============================================================================
// Server Actions — Gestión de miembros del equipo (Settings → Members)
// =============================================================================
// Solo owner/admin. Protecciones:
//   - El owner de la org (organizations.owner_user_id) es intocable.
//   - Nadie puede eliminarse a sí mismo.
//   - Un admin no puede promover a 'owner' (el ownership se transfiere aparte).
// =============================================================================

export type MemberResult = { success: boolean; error?: string }

const ASSIGNABLE_ROLES = ['admin', 'manager', 'viewer', 'employee'] as const
const roleSchema = z.enum(ASSIGNABLE_ROLES)

async function guardTarget(
  sessionOrgId: string,
  targetUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('owner_user_id')
    .eq('id', sessionOrgId)
    .maybeSingle()
  if ((org as { owner_user_id?: string } | null)?.owner_user_id === targetUserId) {
    return { ok: false, error: 'No puedes modificar al dueño de la organización.' }
  }
  return { ok: true }
}

export async function updateMemberRole(
  targetUserId: string,
  role: string,
): Promise<MemberResult> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin'].includes(session.role)) return { success: false, error: 'No autorizado.' }

  const parsed = roleSchema.safeParse(role)
  if (!parsed.success) return { success: false, error: 'Rol inválido.' }

  const guard = await guardTarget(session.organizationId, targetUserId)
  if (!guard.ok) return { success: false, error: guard.error }

  const supabase = createClient()
  const { error } = await supabase
    .from('memberships')
    .update({ role: parsed.data })
    .eq('organization_id', session.organizationId)
    .eq('user_id', targetUserId)
  if (error) return { success: false, error: error.message }

  const { audit } = await import('@/lib/audit')
  await audit({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    action: 'membership.role_change',
    targetTable: 'memberships',
    newData: { targetUserId, role: parsed.data },
  })

  revalidatePath('/(app)/settings/members', 'page')
  return { success: true }
}

export async function removeMember(targetUserId: string): Promise<MemberResult> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin'].includes(session.role)) return { success: false, error: 'No autorizado.' }
  if (targetUserId === session.userId) {
    return { success: false, error: 'No puedes eliminarte a ti mismo.' }
  }

  const guard = await guardTarget(session.organizationId, targetUserId)
  if (!guard.ok) return { success: false, error: guard.error }

  const supabase = createClient()
  const { error } = await supabase
    .from('memberships')
    .delete()
    .eq('organization_id', session.organizationId)
    .eq('user_id', targetUserId)
  if (error) return { success: false, error: error.message }

  const { audit } = await import('@/lib/audit')
  await audit({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    action: 'membership.remove',
    targetTable: 'memberships',
    newData: { targetUserId },
  })

  revalidatePath('/(app)/settings/members', 'page')
  return { success: true }
}

export async function revokeInvitation(invitationId: string): Promise<MemberResult> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin'].includes(session.role)) return { success: false, error: 'No autorizado.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId)
    .eq('organization_id', session.organizationId)
    .is('accepted_at', null)
  if (error) return { success: false, error: error.message }

  revalidatePath('/(app)/settings/members', 'page')
  return { success: true }
}

/** Reenvía la invitación: extiende la expiración y re-manda el email. */
export async function resendInvitation(invitationId: string): Promise<MemberResult> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin'].includes(session.role)) return { success: false, error: 'No autorizado.' }

  const supabase = createClient()
  const { data: invite } = await supabase
    .from('invitations')
    .select('id, email, role, token')
    .eq('id', invitationId)
    .eq('organization_id', session.organizationId)
    .is('accepted_at', null)
    .maybeSingle()
  if (!invite) return { success: false, error: 'Invitación no encontrada o ya aceptada.' }

  const inv = invite as { email: string; role: string; token: string }
  await supabase
    .from('invitations')
    .update({ expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString() })
    .eq('id', invitationId)

  const admin = createAdminClient()
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/en/accept-invite?token=${inv.token}`
  const { error: emailErr } = await admin.auth.admin.inviteUserByEmail(inv.email, {
    redirectTo,
    data: {
      invitation_token: inv.token,
      organization_id: session.organizationId,
      role: inv.role,
    },
  })
  if (emailErr) return { success: false, error: `Error enviando email: ${emailErr.message}` }

  revalidatePath('/(app)/settings/members', 'page')
  return { success: true }
}
