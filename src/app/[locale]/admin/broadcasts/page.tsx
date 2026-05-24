import { createAdminClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/platform'
import { BroadcastComposer } from '@/components/admin/BroadcastComposer'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function BroadcastsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  await requirePlatformAdmin(locale)
  const admin = createAdminClient()

  const { data: broadcasts } = await admin
    .from('broadcasts')
    .select('id, title, body, target_type, target_value, channels, sent_at, created_at')
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Broadcasts</h1>
        <p className="text-sm text-muted-foreground">
          Send announcements, maintenance notices, or feature releases to all or
          specific tenants via in-app, email, SMS, or push.
        </p>
      </header>

      <BroadcastComposer />

      <Card>
        <CardContent className="p-0">
          <h2 className="border-b px-4 py-3 text-sm font-semibold">Recent broadcasts</h2>
          <ul className="divide-y">
            {(broadcasts ?? []).map((b) => (
              <li key={b.id} className="space-y-1 px-4 py-3">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{b.title}</p>
                  <Badge variant="muted" className="text-[10px] capitalize">
                    {b.target_type}
                    {b.target_value ? `:${b.target_value}` : ''}
                  </Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {b.sent_at ? `sent ${new Date(b.sent_at).toLocaleString()}` : 'draft'}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{b.body}</p>
                <div className="flex gap-1">
                  {((b.channels ?? []) as string[]).map((c) => (
                    <Badge key={c} variant="info" className="text-[10px]">
                      {c}
                    </Badge>
                  ))}
                </div>
              </li>
            ))}
            {(broadcasts ?? []).length === 0 && (
              <li className="py-12 text-center text-muted-foreground">
                No broadcasts sent yet. Use the composer above.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
