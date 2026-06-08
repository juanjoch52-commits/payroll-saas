import { createAdminClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/platform'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SupportPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  await requirePlatformAdmin(locale)
  const admin = createAdminClient()

  const { data: tickets } = await admin
    .from('support_tickets')
    .select(
      'id, organization_id, subject, status, priority, created_at, organizations:organization_id(name)',
    )
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  const open = (tickets ?? []).filter((t) => t.status === 'open').length
  const urgent = (tickets ?? []).filter((t) => t.priority === 'urgent').length

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support</h1>
          <p className="text-sm text-muted-foreground">
            {open} open · {urgent} urgent
          </p>
        </div>
      </header>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Opened</th>
              </tr>
            </thead>
            <tbody>
              {(tickets ?? []).map((t) => {
                // organizations is array because Supabase joins return arrays even for many-to-one
                const orgName = Array.isArray(t.organizations)
                  ? (t.organizations[0] as { name?: string } | undefined)?.name
                  : (t.organizations as { name?: string } | null)?.name
                return (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/${locale}/admin/tenants/${t.organization_id}`}
                        className="hover:underline"
                      >
                        {orgName ?? t.organization_id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/${locale}/admin/support/${t.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {t.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={t.status === 'open' ? 'warning' : t.status === 'resolved' ? 'success' : 'muted'}>
                        {t.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 capitalize">
                      <Badge variant={t.priority === 'urgent' ? 'destructive' : t.priority === 'high' ? 'warning' : 'muted'}>
                        {t.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(t.created_at).toLocaleString()}
                    </td>
                  </tr>
                )
              })}
              {(tickets ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    No support tickets yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
