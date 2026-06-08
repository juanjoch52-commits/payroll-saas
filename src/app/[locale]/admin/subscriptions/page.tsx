import { createAdminClient } from '@/lib/supabase/server'

export default async function SubscriptionsPage() {
  const admin = createAdminClient()

  const { data: subs } = await admin
    .from('subscriptions')
    .select(
      'id, status, current_period_end, trial_ends_at, cancel_at_period_end, organization:organization_id (name), plan:plan_id (code, monthly_price_cents)',
    )
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>

      <div className="rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Trial ends</th>
              <th className="px-4 py-3 font-medium">Period ends</th>
              <th className="px-4 py-3 font-medium">Canceling</th>
            </tr>
          </thead>
          <tbody>
            {(subs ?? []).map((s: { id: string; status: string; current_period_end: string | null; trial_ends_at: string | null; cancel_at_period_end: boolean; organization: { name: string } | { name: string }[] | null; plan: { code: string; monthly_price_cents: number } | { code: string; monthly_price_cents: number }[] | null }) => {
              const org = Array.isArray(s.organization) ? s.organization[0] : s.organization
              const plan = Array.isArray(s.plan) ? s.plan[0] : s.plan
              return (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{org?.name ?? '—'}</td>
                  <td className="px-4 py-3 capitalize">{plan?.code ?? '—'}</td>
                  <td className="px-4 py-3 capitalize">{s.status}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.trial_ends_at ? new Date(s.trial_ends_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {s.cancel_at_period_end ? (
                      <span className="font-medium text-warning-foreground">Yes</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
