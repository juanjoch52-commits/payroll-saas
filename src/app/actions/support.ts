'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/platform'

// =============================================================================
// Server Actions — Soporte (panel de plataforma)
// =============================================================================
// Solo platform_admins. Escriben con service role (admin client). Responder a un
// ticket añade un mensaje al hilo, lo pasa a "in_progress" y notifica al autor.
// =============================================================================

const STATUSES = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'] as const
export type TicketStatus = (typeof STATUSES)[number]

export async function replyToTicket(
  ticketId: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await requirePlatformAdmin('en')
  const text = body.trim()
  if (!text) return { success: false, error: 'Empty reply.' }

  const admin = createAdminClient()
  const { data: ticket } = await admin
    .from('support_tickets')
    .select('id, organization_id, opened_by, subject, status')
    .eq('id', ticketId)
    .maybeSingle()
  if (!ticket) return { success: false, error: 'Ticket not found.' }

  const { error } = await admin.from('support_ticket_messages').insert({
    ticket_id: ticketId,
    author_id: session.userId,
    author_role: 'platform_admin',
    body: text,
  })
  if (error) return { success: false, error: error.message }

  // Al responder, mover a in_progress si estaba abierto.
  if ((ticket as { status: string }).status === 'open') {
    await admin.from('support_tickets').update({ status: 'in_progress' }).eq('id', ticketId)
  }

  // Notifica al autor del ticket (inapp + email según sus preferencias).
  const t = ticket as { organization_id: string; opened_by: string; subject: string }
  try {
    const { dispatch } = await import('@/lib/notifications/dispatch')
    await dispatch({
      userId: t.opened_by,
      organizationId: t.organization_id,
      type: 'support_reply',
      title: `Re: ${t.subject}`,
      body: text.slice(0, 280),
    })
  } catch {
    // La notificación es best-effort; no bloquea la respuesta.
  }

  revalidatePath(`/admin/support/${ticketId}`, 'page')
  return { success: true }
}

export async function setTicketStatus(
  ticketId: string,
  status: TicketStatus,
): Promise<{ success: boolean; error?: string }> {
  await requirePlatformAdmin('en')
  if (!STATUSES.includes(status)) return { success: false, error: 'Invalid status.' }

  const admin = createAdminClient()
  const patch: Record<string, unknown> = { status }
  if (status === 'resolved' || status === 'closed') patch.closed_at = new Date().toISOString()
  else patch.closed_at = null

  const { error } = await admin.from('support_tickets').update(patch).eq('id', ticketId)
  if (error) return { success: false, error: error.message }

  revalidatePath(`/admin/support/${ticketId}`, 'page')
  revalidatePath('/admin/support', 'page')
  return { success: true }
}
