import Link from 'next/link'
import { Search, ShieldCheck } from 'lucide-react'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/platform'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

type UserRow = {
  user_id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  full_name: string | null
  memberships: { organization_id: string; org_name: string; role: string }[]
  total_count: number
}

/**
 * Todos los usuarios de la plataforma (cross-tenant): quién se inscribió,
 * cuándo, a qué org pertenece y cuándo entró por última vez. La lectura de
 * auth.users pasa por el RPC admin_list_users (guard is_platform_admin) con
 * el cliente del usuario — el service role solo se usa para marcar quiénes
 * son platform admins.
 */
export default async function AdminUsersPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { q?: string; page?: string }
}) {
  await requirePlatformAdmin(locale)

  const q = (searchParams.q ?? '').trim()
  const page = Math.max(1, Number.parseInt(searchParams.page ?? '1', 10) || 1)

  const supabase = createClient()
  const { data, error } = await supabase.rpc('admin_list_users', {
    p_search: q || null,
    p_org_id: null,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  })
  const users = (data ?? []) as UserRow[]
  const total = users[0]?.total_count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Marcar platform admins (tabla + allowlist de emails)
  const admin = createAdminClient()
  const [{ data: adminRows }, { data: adminEmails }] = await Promise.all([
    admin.from('platform_admins').select('user_id'),
    admin.from('platform_admin_emails').select('email'),
  ])
  const adminIds = new Set((adminRows ?? []).map((r: { user_id: string }) => r.user_id))
  const adminMails = new Set(
    (adminEmails ?? []).map((r: { email: string }) => r.email.toLowerCase()),
  )

  const pageHref = (p: number) =>
    `/${locale}/admin/users?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(p > 1 ? { page: String(p) } : {}),
    }).toString()}`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            {total} user{total === 1 ? '' : 's'} across all tenants
            {q ? ` · matching “${q}”` : ''}
          </p>
        </div>
        <form className="flex items-center gap-2" action={`/${locale}/admin/users`}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by email…"
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
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Organizations</th>
              <th className="px-4 py-3 font-medium">Confirmed</th>
              <th className="px-4 py-3 font-medium">Signed up</th>
              <th className="px-4 py-3 font-medium">Last sign-in</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isAdmin = adminIds.has(u.user_id) || adminMails.has(u.email.toLowerCase())
              return (
                <tr key={u.user_id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium">{u.email}</p>
                        {u.full_name && (
                          <p className="text-xs text-muted-foreground">{u.full_name}</p>
                        )}
                      </div>
                      {isAdmin && (
                        <Badge variant="warning" className="gap-1 text-[10px] uppercase">
                          <ShieldCheck className="h-3 w-3" /> Platform
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {u.memberships.length === 0 && (
                        <span className="text-xs text-muted-foreground">— no org —</span>
                      )}
                      {u.memberships.map((m) => (
                        <Link
                          key={`${u.user_id}-${m.organization_id}-${m.role}`}
                          href={`/${locale}/admin/tenants/${m.organization_id}`}
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs hover:border-primary hover:text-primary"
                        >
                          {m.org_name}
                          <span className="text-muted-foreground">· {m.role}</span>
                        </Link>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.email_confirmed_at ? (
                      <Badge variant="success">Yes</Badge>
                    ) : (
                      <Badge variant="warning">Pending</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : 'Never'}
                  </td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  {error ? `Error: ${error.message}` : 'No users found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(page - 1)}>← Previous</Link>
              </Button>
            )}
            {page < totalPages && (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(page + 1)}>Next →</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
