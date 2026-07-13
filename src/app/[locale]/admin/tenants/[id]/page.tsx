import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, ExternalLink } from 'lucide-react'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/platform'
import { adminSetPlan, adminSetSuspended, adminSetTrialEnd } from '@/app/actions/admin-tenants'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { FeatureOverridesManager } from '@/components/admin/FeatureOverridesManager'
import { startImpersonation } from '@/lib/admin/impersonate'

export const dynamic = 'force-dynamic'

export default async function TenantDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string }
}) {
  await requirePlatformAdmin(locale)
  const admin = createAdminClient()

  const { data: org } = await admin
    .from('organizations')
    .select('id, name, created_at, slug, country')
    .eq('id', id)
    .single()

  if (!org) notFound()

  type PlanRow = { code: string; name: string; monthly_price_cents: number } | null
  function unwrapPlan(p: unknown): PlanRow {
    if (!p) return null
    if (Array.isArray(p)) return (p[0] ?? null) as PlanRow
    return p as PlanRow
  }

  // Emails/last-login de los miembros: RPC guardado por is_platform_admin(),
  // llamado con el cliente del USUARIO (el guard necesita su JWT).
  const supabase = createClient()
  type MemberDetail = {
    user_id: string
    email: string
    full_name: string | null
    last_sign_in_at: string | null
    email_confirmed_at: string | null
    memberships: { organization_id: string; org_name: string; role: string }[]
  }

  const [
    { data: members },
    { data: sub },
    { data: empCount },
    { data: auditRecent },
    { data: overrides },
    { data: tickets },
    { data: memberDetailsRaw },
    { data: allPlans },
  ] = await Promise.all([
    admin
      .from('memberships')
      .select('user_id, role, created_at')
      .eq('organization_id', id),
    admin
      .from('subscriptions')
      .select(
        'id, status, current_period_end, trial_ends_at, stripe_subscription_id, plans:plan_id(code, name, monthly_price_cents)',
      )
      .eq('organization_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', id),
    admin
      .from('audit_logs')
      .select('id, action, actor_user_id, created_at')
      .eq('organization_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('feature_overrides')
      .select('flag_key, enabled, reason, expires_at')
      .eq('organization_id', id),
    admin
      .from('support_tickets')
      .select('id, subject, status, priority, created_at')
      .eq('organization_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.rpc('admin_list_users', { p_search: null, p_org_id: id, p_limit: 200, p_offset: 0 }),
    admin.from('plans').select('code, name').order('sort_order'),
  ])

  const memberDetails = new Map(
    ((memberDetailsRaw ?? []) as MemberDetail[]).map((m) => [m.user_id, m]),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href={`/${locale}/admin/tenants`}
            className="mb-2 inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3 w-3" /> All tenants
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{org.name}</h1>
          <p className="text-sm text-muted-foreground">
            {org.slug} · {org.country ?? 'US'} · created {new Date(org.created_at).toLocaleDateString()}
          </p>
        </div>
        <ImpersonateMenu
          orgId={org.id}
          orgName={org.name}
          members={members ?? []}
          locale={locale}
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="flags">Feature flags</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Plan
              </p>
              <CardTitle className="text-xl">{unwrapPlan(sub?.plans)?.name ?? '—'}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={sub?.status === 'active' ? 'success' : 'warning'}>
                {sub?.status ?? 'none'}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Users
              </p>
              <CardTitle className="text-3xl tabular-nums">
                {members?.length ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Employees
              </p>
              <CardTitle className="text-3xl tabular-nums">{empCount?.length ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Confirmed</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Last sign-in</th>
                  </tr>
                </thead>
                <tbody>
                  {(members ?? []).map((m) => {
                    const d = memberDetails.get(m.user_id)
                    return (
                      <tr key={m.user_id} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          {d ? (
                            <div>
                              <p className="font-medium">{d.email}</p>
                              <p className="font-mono text-[10px] text-muted-foreground">
                                {d.full_name ? `${d.full_name} · ` : ''}
                                {m.user_id.slice(0, 8)}…
                              </p>
                            </div>
                          ) : (
                            <span className="font-mono text-xs">{m.user_id}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="muted">{m.role}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {d?.email_confirmed_at ? (
                            <Badge variant="success">Yes</Badge>
                          ) : (
                            <Badge variant="warning">Pending</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(m.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {d?.last_sign_in_at
                            ? new Date(d.last_sign_in_at).toLocaleString()
                            : 'Never'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription */}
        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Plan code" value={unwrapPlan(sub?.plans)?.code ?? '—'} />
              <Row label="Plan name" value={unwrapPlan(sub?.plans)?.name ?? '—'} />
              <Row
                label="Monthly base (+ per-worker seats)"
                value={
                  unwrapPlan(sub?.plans)?.monthly_price_cents
                    ? `$${(unwrapPlan(sub?.plans)!.monthly_price_cents / 100).toFixed(2)}`
                    : '—'
                }
              />
              <Row label="Status" value={sub?.status ?? '—'} />
              <Row
                label="Trial ends"
                value={sub?.trial_ends_at ? new Date(sub.trial_ends_at).toLocaleDateString() : '—'}
              />
              <Row
                label="Renews"
                value={sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '—'}
              />
              <Row label="Stripe" value={sub?.stripe_subscription_id ? 'Linked' : 'Not linked'} />
            </CardContent>
          </Card>

          <SubscriptionControls
            orgId={id}
            status={sub?.status ?? null}
            trialEndsAt={sub?.trial_ends_at ?? null}
            currentPlanCode={unwrapPlan(sub?.plans)?.code ?? null}
            hasStripe={Boolean(sub?.stripe_subscription_id)}
            plans={(allPlans ?? []) as { code: string; name: string }[]}
          />
        </TabsContent>

        {/* Audit */}
        <TabsContent value="audit">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">When</th>
                  </tr>
                </thead>
                <tbody>
                  {(auditRecent ?? []).map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">{a.action}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {a.actor_user_id?.slice(0, 8) ?? 'system'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(a.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {(auditRecent ?? []).length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                        No audit entries yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="border-t p-4 text-right">
                <Link
                  href={`/${locale}/admin/audit?org_id=${id}`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Full audit log <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature flags */}
        <TabsContent value="flags">
          <Card>
            <CardHeader>
              <CardTitle>Feature overrides</CardTitle>
              <p className="text-sm text-muted-foreground">
                Custom features enabled or disabled for this tenant on top of their plan.
              </p>
            </CardHeader>
            <CardContent>
              <FeatureOverridesManager orgId={id} overrides={overrides ?? []} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Support */}
        <TabsContent value="support">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Opened</th>
                  </tr>
                </thead>
                <tbody>
                  {(tickets ?? []).map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{t.subject}</td>
                      <td className="px-4 py-3">
                        <Badge variant={t.status === 'open' ? 'warning' : 'muted'}>
                          {t.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 capitalize">{t.priority}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {(tickets ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No support tickets.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

/**
 * Controles manuales de la suscripción (extender trial, comp de plan,
 * suspender/reactivar). NO tocan Stripe — para cuentas pagas con Stripe
 * linkeado, el próximo webhook puede sobreescribir el estado.
 */
function SubscriptionControls({
  orgId,
  status,
  trialEndsAt,
  currentPlanCode,
  hasStripe,
  plans,
}: {
  orgId: string
  status: string | null
  trialEndsAt: string | null
  currentPlanCode: string | null
  hasStripe: boolean
  plans: { code: string; name: string }[]
}) {
  async function doSetTrial(formData: FormData) {
    'use server'
    const date = String(formData.get('trialEndsAt') ?? '')
    if (date) await adminSetTrialEnd(String(formData.get('orgId')), date)
  }
  async function doSetPlan(formData: FormData) {
    'use server'
    const code = String(formData.get('planCode') ?? '')
    if (code) await adminSetPlan(String(formData.get('orgId')), code)
  }
  async function doSuspend(formData: FormData) {
    'use server'
    await adminSetSuspended(
      String(formData.get('orgId')),
      formData.get('suspend') === 'true',
    )
  }

  // Default del input: trial actual o hoy+30
  const defaultTrialDate = new Date(
    trialEndsAt ? new Date(trialEndsAt).getTime() : Date.now() + 30 * 86_400_000,
  )
    .toISOString()
    .slice(0, 10)

  const suspended = status === 'canceled' || status === 'unpaid'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin controls</CardTitle>
        <p className="text-sm text-muted-foreground">
          Manual overrides — they do not touch Stripe.
          {hasStripe && ' This org IS linked to Stripe: the next webhook may overwrite status/plan.'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={doSetTrial} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="orgId" value={orgId} />
          <span className="w-40 text-sm text-muted-foreground">Set trial end</span>
          <input
            type="date"
            name="trialEndsAt"
            defaultValue={defaultTrialDate}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          />
          <Button type="submit" size="sm" variant="outline">
            Apply (sets status to trialing)
          </Button>
        </form>

        <form action={doSetPlan} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="orgId" value={orgId} />
          <span className="w-40 text-sm text-muted-foreground">Change plan</span>
          <select
            name="planCode"
            defaultValue={currentPlanCode ?? ''}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="" disabled>
              Pick a plan…
            </option>
            {plans.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" variant="outline">
            Apply
          </Button>
        </form>

        <form action={doSuspend} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="orgId" value={orgId} />
          <input type="hidden" name="suspend" value={suspended ? 'false' : 'true'} />
          <span className="w-40 text-sm text-muted-foreground">
            {suspended ? 'Suspended' : 'Access'}
          </span>
          <Button type="submit" size="sm" variant={suspended ? 'default' : 'destructive'}>
            {suspended ? 'Reactivate (set active)' : 'Suspend (blocks core writes)'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function ImpersonateMenu({
  orgId,
  orgName,
  members,
  locale,
}: {
  orgId: string
  orgName: string
  members: { user_id: string; role: string }[]
  locale: string
}) {
  // Find owner first
  const owner = members.find((m) => m.role === 'owner') ?? members[0]
  if (!owner) {
    return (
      <Button variant="outline" disabled>
        No users to impersonate
      </Button>
    )
  }

  // Wrap server action to satisfy form action signature (no return value)
  async function doImpersonate(formData: FormData) {
    'use server'
    await startImpersonation(formData)
  }

  return (
    <form action={doImpersonate} className="flex items-center gap-2">
      <input type="hidden" name="targetUserId" value={owner.user_id} />
      <input type="hidden" name="targetOrgId" value={orgId} />
      <input type="hidden" name="locale" value={locale} />
      <input
        name="reason"
        required
        minLength={5}
        placeholder="Reason (required)"
        className="h-9 rounded-md border bg-background px-3 text-sm"
      />
      <Button type="submit" variant="destructive" size="sm">
        Impersonate {orgName.slice(0, 16)}
      </Button>
    </form>
  )
}
