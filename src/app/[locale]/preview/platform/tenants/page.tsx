import { MOCK_TENANTS } from '@/lib/preview/mock-data'

export default async function PreviewPlatformTenantsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
      <p className="text-muted-foreground">{MOCK_TENANTS.length} organizations</p>

      <div className="rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Country</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Employees</th>
              <th className="px-4 py-3 font-medium">MRR</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_TENANTS.map((t) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.slug}</td>
                <td className="px-4 py-3">{t.country}</td>
                <td className="px-4 py-3 capitalize">{t.plan}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      t.status === 'active'
                        ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700'
                        : t.status === 'trialing'
                          ? 'rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700'
                          : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700'
                    }
                  >
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3">{t.employees}</td>
                <td className="px-4 py-3">{t.mrr > 0 ? `$${t.mrr}` : '—'}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{t.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
