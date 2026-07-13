import Link from 'next/link'
import { Search } from 'lucide-react'

import { createAdminClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

type TenantRow = {
  id: string
  name: string
  slug: string
  country: string
  created_at: string
  subscriptions:
    | {
        status: string
        trial_ends_at: string | null
        plans: { code: string } | { code: string }[] | null
      }[]
    | {
        status: string
        trial_ends_at: string | null
        plans: { code: string } | { code: string }[] | null
      }
    | null
}

export default async function TenantsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { q?: string }
}) {
  const admin = createAdminClient()
  const q = (searchParams.q ?? '').trim()

  let query = admin
    .from('organizations')
    .select(
      'id, name, slug, country, created_at, subscriptions(status, trial_ends_at, plans:plan_id (code))',
    )
    .order('created_at', { ascending: false })
    .limit(200)
  if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`)

  const { data: tenants } = await query

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">
            {tenants?.length ?? 0} organizations{q ? ` · matching “${q}”` : ''}
          </p>
        </div>
        <form className="flex items-center gap-2" action={`/${locale}/admin/tenants`}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name or slug…"
              className="h-9 w-64 rounded-md border bg-background pl-8 pr-3 text-sm"
            />
          </div>
          <Button type="submit" size="sm" variant="outline">
            Search
          </Button>
        </form>
      </div>

      <div className="rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Country</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Trial ends</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {((tenants ?? []) as TenantRow[]).map((t) => {
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
                    {sub?.trial_ends_at ? new Date(sub.trial_ends_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                </tr>
              )
            })}
            {(tenants ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No tenants found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
