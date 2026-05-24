import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'

export default async function TenantsPage({ params: { locale } }: { params: { locale: string } }) {
  const admin = createAdminClient()

  const { data: tenants } = await admin
    .from('organizations')
    .select(
      'id, name, slug, country, created_at, subscriptions(status, plans:plan_id (code, monthly_price_cents))',
    )
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
      <p className="text-muted-foreground">{tenants?.length ?? 0} organizations</p>

      <div className="rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Country</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {(tenants ?? []).map((t: { id: string; name: string; slug: string; country: string; created_at: string; subscriptions: { status: string; plans: { code: string; monthly_price_cents: number } | { code: string; monthly_price_cents: number }[] }[] | { status: string; plans: { code: string; monthly_price_cents: number } | { code: string; monthly_price_cents: number }[] } | null }) => {
              const sub = Array.isArray(t.subscriptions) ? t.subscriptions[0] : t.subscriptions
              const plan = sub ? (Array.isArray(sub.plans) ? sub.plans[0] : sub.plans) : null
              return (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/${locale}/admin/tenants/${t.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.slug}</td>
                  <td className="px-4 py-3">{t.country}</td>
                  <td className="px-4 py-3 capitalize">{plan?.code ?? '—'}</td>
                  <td className="px-4 py-3 capitalize">{sub?.status ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString()}
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
