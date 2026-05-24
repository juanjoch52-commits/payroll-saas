import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences'

export const dynamic = 'force-dynamic'

export default async function NotificationPreferencesPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('type, channel, enabled')
    .eq('user_id', session.userId)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Notification preferences</h1>
        <p className="text-sm text-muted-foreground">
          Choose how you want to be notified for each event.
        </p>
      </header>

      <NotificationPreferences
        userId={session.userId}
        initialPrefs={
          (prefs ?? []) as { type: string; channel: string; enabled: boolean }[]
        }
      />
    </div>
  )
}
