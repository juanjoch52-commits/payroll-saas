import { createAdminClient } from '@/lib/supabase/server'

export default async function WebhookEventsPage() {
  const admin = createAdminClient()

  const { data: events } = await admin
    .from('webhook_events')
    .select('id, provider, external_id, event_type, processed_at, error, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Webhook events</h1>
      <p className="text-muted-foreground">Last 100 events received from external providers.</p>

      <div className="rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium">External ID</th>
              <th className="px-4 py-3 font-medium">Received</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(events ?? []).map((e: { id: string; provider: string; event_type: string; external_id: string | null; created_at: string; processed_at: string | null; error: string | null }) => (
              <tr key={e.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{e.provider}</td>
                <td className="px-4 py-3 font-mono text-xs">{e.event_type}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {e.external_id ?? '—'}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {e.error ? (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                      error
                    </span>
                  ) : e.processed_at ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                      processed
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      pending
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
