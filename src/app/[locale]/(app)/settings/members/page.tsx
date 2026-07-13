import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { PageHeader } from '@/components/ui/page-header'
import { MembersManager } from '@/components/settings/MembersManager'

export const dynamic = 'force-dynamic'

export default async function MembersPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  if (!['owner', 'admin'].includes(session.role)) {
    return <p className="p-6 text-destructive">{t('errors.unauthorized')}</p>
  }

  const supabase = createClient()
  const [{ data: memberships }, { data: org }, { data: invites }] = await Promise.all([
    supabase
      .from('memberships')
      .select('user_id, role, created_at')
      .eq('organization_id', session.organizationId)
      .order('created_at', { ascending: true })
      .limit(200),
    supabase.from('organizations').select('owner_user_id').eq('id', session.organizationId).maybeSingle(),
    supabase
      .from('invitations')
      .select('id, email, role, expires_at')
      .eq('organization_id', session.organizationId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  // Emails de los miembros vía Auth Admin API (RLS no expone auth.users).
  const admin = createAdminClient()
  const members = await Promise.all(
    (memberships ?? []).map(async (m: { user_id: string; role: string; created_at: string }) => {
      try {
        const { data } = await admin.auth.admin.getUserById(m.user_id)
        return { ...m, email: data?.user?.email ?? null }
      } catch {
        return { ...m, email: null }
      }
    }),
  )

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/settings`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        {t('common.back')}
      </Link>

      <PageHeader
        title="Team members"
        description="Manage roles, remove members, and handle pending invitations."
      />

      <MembersManager
        members={members}
        invites={(invites ?? []) as never}
        ownerUserId={(org as { owner_user_id: string } | null)?.owner_user_id ?? ''}
        currentUserId={session.userId}
      />
    </div>
  )
}
