import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/platform'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { TicketActions } from '@/components/admin/TicketActions'
import type { TicketStatus } from '@/app/actions/support'

export const dynamic = 'force-dynamic'

const statusVariant: Record<string, 'warning' | 'success' | 'muted' | 'info'> = {
  open: 'warning',
  in_progress: 'info',
  waiting_user: 'muted',
  resolved: 'success',
  closed: 'muted',
}

export default async function TicketDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string }
}) {
  await requirePlatformAdmin(locale)
  const admin = createAdminClient()

  const { data: ticket } = await admin
    .from('support_tickets')
    .select(
      'id, organization_id, subject, body, status, priority, created_at, organizations:organization_id(name)',
    )
    .eq('id', id)
    .maybeSingle()

  if (!ticket) {
    return (
      <div className="space-y-4">
        <Link href={`/${locale}/admin/support`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="mr-1 h-4 w-4" /> Support
        </Link>
        <p className="text-destructive">Ticket not found.</p>
      </div>
    )
  }

  const orgName = Array.isArray(ticket.organizations)
    ? (ticket.organizations[0] as { name?: string } | undefined)?.name
    : (ticket.organizations as { name?: string } | null)?.name

  const { data: messages } = await admin
    .from('support_ticket_messages')
    .select('id, author_role, body, created_at')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  const t = ticket as unknown as {
    subject: string
    body: string
    status: string
    priority: string
    created_at: string
    organization_id: string
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/admin/support`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Support
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.subject}</h1>
          <p className="text-sm text-muted-foreground">
            <Link href={`/${locale}/admin/tenants/${t.organization_id}`} className="hover:underline">
              {orgName ?? t.organization_id.slice(0, 8)}
            </Link>{' '}
            · {new Date(t.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={t.priority === 'urgent' ? 'destructive' : t.priority === 'high' ? 'warning' : 'muted'} className="capitalize">
            {t.priority}
          </Badge>
          <Badge variant={statusVariant[t.status] ?? 'muted'}>{t.status.replace('_', ' ')}</Badge>
        </div>
      </div>

      {/* Hilo de mensajes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Mensaje original del tenant */}
          <div className="max-w-[85%] rounded-lg border bg-muted/40 p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Tenant</p>
            <p className="whitespace-pre-wrap text-sm">{t.body}</p>
          </div>

          {(messages ?? []).map((m) => {
            const isAdmin = m.author_role === 'platform_admin'
            return (
              <div
                key={m.id}
                className={cn(
                  'max-w-[85%] rounded-lg border p-3',
                  isAdmin ? 'ml-auto border-primary/30 bg-primary/5' : 'bg-muted/40',
                )}
              >
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  {isAdmin ? 'Support' : 'Tenant'} · {new Date(m.created_at).toLocaleString()}
                </p>
                <p className="whitespace-pre-wrap text-sm">{m.body}</p>
              </div>
            )
          })}
          {(messages ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No replies yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Acciones: responder + cambiar estado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Respond</CardTitle>
        </CardHeader>
        <CardContent>
          <TicketActions ticketId={id} currentStatus={t.status as TicketStatus} />
        </CardContent>
      </Card>
    </div>
  )
}
