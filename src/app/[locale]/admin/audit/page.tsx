import { createAdminClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/platform'
import { Card, CardContent } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

type SearchParams = {
  org_id?: string
  action?: string
  actor?: string
}

export default async function AuditLogsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: SearchParams
}) {
  await requirePlatformAdmin(locale)
  const admin = createAdminClient()

  let q = admin
    .from('audit_logs')
    .select(
      'id, organization_id, actor_user_id, action, target_table, target_id, ip_address, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (searchParams.org_id) q = q.eq('organization_id', searchParams.org_id)
  if (searchParams.action) q = q.ilike('action', `%${searchParams.action}%`)
  if (searchParams.actor) q = q.eq('actor_user_id', searchParams.actor)

  const { data: logs } = await q

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Audit logs</h1>
        <p className="text-sm text-muted-foreground">
          Last 200 entries across all tenants. Filter by org / action / actor via URL params.
        </p>
      </header>

      <form className="flex flex-wrap gap-3 rounded-lg border bg-card p-4" method="get">
        <input
          name="org_id"
          defaultValue={searchParams.org_id ?? ''}
          placeholder="Organization ID"
          className="h-9 flex-1 min-w-[160px] rounded-md border bg-background px-3 text-sm font-mono"
        />
        <input
          name="action"
          defaultValue={searchParams.action ?? ''}
          placeholder="Action (e.g. payroll_run.approve)"
          className="h-9 flex-1 min-w-[160px] rounded-md border bg-background px-3 text-sm"
        />
        <input
          name="actor"
          defaultValue={searchParams.actor ?? ''}
          placeholder="Actor user ID"
          className="h-9 flex-1 min-w-[160px] rounded-md border bg-background px-3 text-sm font-mono"
        />
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Filter
        </button>
      </form>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Org</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((l) => (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{l.action}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                    {l.organization_id?.slice(0, 8) ?? '—'}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                    {l.actor_user_id?.slice(0, 8) ?? 'system'}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {l.target_table}
                    {l.target_id ? `/${l.target_id.slice(0, 8)}` : ''}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                    {l.ip_address ?? '—'}
                  </td>
                </tr>
              ))}
              {(logs ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No audit entries matching the filters.
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
