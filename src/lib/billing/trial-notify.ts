import { createAdminClient } from '@/lib/supabase/server'

/**
 * trial_ending sin cron: se dispara al cargar el dashboard cuando quedan
 * ≤7 días (una vez) y de nuevo cuando quedan ≤2 (una vez), a owners/admins.
 *
 * El dedupe del dispatcher solo cubre el canal in-app (upsert), así que aquí
 * comprobamos el dedupe_key ANTES de despachar — si ya existe la notificación
 * no se reenvía nada (ni email ni push). Best-effort: nunca rompe el render.
 */
export async function maybeNotifyTrialEnding(organizationId: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const { data: sub } = await admin
      .from('subscriptions')
      .select('status, trial_ends_at')
      .eq('organization_id', organizationId)
      .maybeSingle()
    const s = sub as { status: string; trial_ends_at: string | null } | null
    if (!s || s.status !== 'trialing' || !s.trial_ends_at) return

    const msLeft = new Date(s.trial_ends_at).getTime() - Date.now()
    if (msLeft <= 0) return
    const daysLeft = Math.ceil(msLeft / 86_400_000)
    const threshold = daysLeft <= 2 ? 'd2' : daysLeft <= 7 ? 'd7' : null
    if (!threshold) return

    const [{ data: org }, { data: members }] = await Promise.all([
      admin.from('organizations').select('name').eq('id', organizationId).maybeSingle(),
      admin
        .from('memberships')
        .select('user_id')
        .eq('organization_id', organizationId)
        .in('role', ['owner', 'admin']),
    ])
    const orgName = (org as { name: string } | null)?.name ?? 'tu organización'

    const { dispatch } = await import('@/lib/notifications/dispatch')
    for (const m of (members ?? []) as { user_id: string }[]) {
      const dedupeKey = `trial-${threshold}-${organizationId}`

      // Ya avisado en este umbral → no repetir (protege email/push, no solo in-app).
      const { data: existing } = await admin
        .from('notifications')
        .select('id')
        .eq('user_id', m.user_id)
        .eq('dedupe_key', dedupeKey)
        .maybeSingle()
      if (existing) continue

      await dispatch({
        userId: m.user_id,
        organizationId,
        type: 'trial_ending',
        title: daysLeft <= 2 ? 'Tu prueba termina muy pronto' : 'Tu prueba está por terminar',
        body: `Quedan ${daysLeft} día${daysLeft === 1 ? '' : 's'} de prueba de ${orgName}. Elige un plan para no perder acceso.`,
        dedupeKey,
        cta: { label: 'Elegir plan', url: '/billing' },
        emailTemplateData: { orgName, daysLeft },
      }).catch(() => {})
    }
  } catch {
    /* no crítico */
  }
}
