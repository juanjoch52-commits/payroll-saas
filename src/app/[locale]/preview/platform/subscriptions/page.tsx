import { MOCK_TENANTS } from '@/lib/preview/mock-data'

export default async function PreviewSubscriptionsPage() {
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
              <th className="px-4 py-3 font-medium">MRR</th>
              <th className="px-4 py-3 font-medium">Trial ends</th>
              <th className="px-4 py-3 font-medium">Period ends</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_TENANTS.map((t) => (
              <tr key={t.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 capitalize">{t.plan}</td>
                <td className="px-4 py-3 capitalize">{t.status.replace('_', ' ')}</td>
                <td className="px-4 py-3">{t.mrr > 0 ? `$${t.mrr}/mo` : '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {t.status === 'trialing' ? '2026-05-29' : '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {t.status === 'active' ? '2026-06-12' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
