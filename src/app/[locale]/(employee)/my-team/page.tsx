import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { TeamFeed } from '@/components/team/TeamFeed'

export default async function MyTeamPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()

  const { data: announcements } = await supabase
    .from('announcements')
    .select('id, title, body, created_at')
    .eq('organization_id', session.organizationId)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: reads } = await supabase
    .from('announcement_reads')
    .select('announcement_id')
    .eq('user_id', session.userId)
  const readSet = new Set((reads ?? []).map((r: { announcement_id: string }) => r.announcement_id))

  const { data: messages } = await supabase
    .from('team_messages')
    .select('id, author_name, body, created_at')
    .eq('organization_id', session.organizationId)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="container max-w-md py-6">
      <Link href={`/${locale}/profile`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="h-4 w-4" /> {t('paystub.back')}
      </Link>
      <h1 className="mb-4 text-2xl font-bold">{t('team.myTitle')}</h1>
      <TeamFeed
        canPostAnnouncements={false}
        announcements={((announcements ?? []).map((a) => ({ ...a, read: readSet.has(a.id) })) as never)}
        messages={(messages ?? []) as never}
      />
    </div>
  )
}
