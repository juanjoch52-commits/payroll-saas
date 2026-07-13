import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { TeamFeed } from '@/components/team/TeamFeed'

export default async function AnnouncementsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return <p className="p-6 text-destructive">{t('errors.unauthorized')}</p>
  }
  const supabase = createClient()

  const { data: announcements } = await supabase
    .from('announcements')
    .select('id, title, body, created_at')
    .eq('organization_id', session.organizationId)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: messages } = await supabase
    .from('team_messages')
    .select('id, author_name, body, created_at')
    .eq('organization_id', session.organizationId)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('team.title')}</h1>
        <p className="text-muted-foreground">{t('team.subtitle')}</p>
      </div>
      <TeamFeed
        canPostAnnouncements
        announcements={((announcements ?? []).map((a) => ({ ...a, read: true })) as never)}
        messages={(messages ?? []) as never}
      />
    </div>
  )
}
