'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'

function isManager(role: string) {
  return ['owner', 'admin', 'manager'].includes(role)
}
export type TeamResult = { success: boolean; error?: string }

const announceSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
})

export async function postAnnouncement(input: z.input<typeof announceSchema>): Promise<TeamResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const parsed = announceSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const supabase = createClient()
  const { error } = await supabase.from('announcements').insert({
    organization_id: session.organizationId,
    title: parsed.data.title,
    body: parsed.data.body,
    posted_by: session.userId,
  })
  if (error) return { success: false, error: error.message }

  // Notifica al equipo (best-effort).
  try {
    const admin = createAdminClient()
    const { data: members } = await admin
      .from('memberships')
      .select('user_id')
      .eq('organization_id', session.organizationId)
    const { dispatch } = await import('@/lib/notifications/dispatch')
    for (const m of (members ?? []) as { user_id: string }[]) {
      if (m.user_id === session.userId) continue
      await dispatch({
        userId: m.user_id,
        type: 'broadcast',
        title: parsed.data.title,
        body: parsed.data.body.slice(0, 140),
      }).catch(() => {})
    }
  } catch {
    /* no crítico */
  }

  revalidatePath('/(app)/announcements', 'page')
  revalidatePath('/(employee)', 'layout')
  return { success: true }
}

export async function markAnnouncementRead(id: string): Promise<TeamResult> {
  const session = await requireSession('/en/login')
  const supabase = createClient()
  const { error } = await supabase
    .from('announcement_reads')
    .upsert({ announcement_id: id, user_id: session.userId }, { onConflict: 'announcement_id,user_id' })
  if (error) return { success: false, error: error.message }
  revalidatePath('/(employee)', 'layout')
  return { success: true }
}

export async function postMessage(body: string): Promise<TeamResult> {
  const session = await requireSession('/en/login')
  if (!body.trim() || body.length > 1000) return { success: false, error: 'Mensaje inválido.' }
  const supabase = createClient()

  const { data: emp } = await supabase
    .from('employees')
    .select('first_name, last_name')
    .eq('user_id', session.userId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  const e = emp as { first_name: string; last_name: string } | null
  const authorName = e ? `${e.first_name} ${e.last_name}` : session.email.split('@')[0]

  const { error } = await supabase.from('team_messages').insert({
    organization_id: session.organizationId,
    user_id: session.userId,
    author_name: authorName,
    body: body.trim(),
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/announcements', 'page')
  revalidatePath('/(employee)', 'layout')
  return { success: true }
}
