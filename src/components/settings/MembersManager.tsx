'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, RefreshCw, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  updateMemberRole,
  removeMember,
  revokeInvitation,
  resendInvitation,
} from '@/app/actions/members'

type Member = { user_id: string; role: string; email: string | null; created_at: string }
type Invite = { id: string; email: string; role: string; expires_at: string }

const ROLES = ['admin', 'manager', 'viewer', 'employee'] as const

export function MembersManager({
  members,
  invites,
  ownerUserId,
  currentUserId,
}: {
  members: Member[]
  invites: Invite[]
  ownerUserId: string
  currentUserId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (!res.success) setError(res.error ?? 'Error')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isOwner = m.user_id === ownerUserId
              const isSelf = m.user_id === currentUserId
              return (
                <tr key={m.user_id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium">{m.email ?? m.user_id.slice(0, 8)}</span>
                    {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                  </td>
                  <td className="px-4 py-3">
                    {isOwner ? (
                      <Badge variant="info">owner</Badge>
                    ) : (
                      <select
                        value={m.role}
                        onChange={(e) => run(() => updateMemberRole(m.user_id, e.target.value))}
                        disabled={pending}
                        aria-label={`Role for ${m.email ?? m.user_id}`}
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm capitalize"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-2 py-3 text-right">
                    {!isOwner && !isSelf && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        aria-label={`Remove ${m.email ?? 'member'}`}
                        onClick={() => {
                          if (confirm('Remove this member from the organization?'))
                            run(() => removeMember(m.user_id))
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Pending invitations
        </h2>
        {invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending invitations.</p>
        ) : (
          <ul className="divide-y rounded-md border bg-card">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <div>
                  <span className="font-medium">{i.email}</span>
                  <span className="ml-2 capitalize text-muted-foreground">{i.role}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    expires {new Date(i.expires_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => resendInvitation(i.id))}
                    className="gap-1 text-xs"
                  >
                    <RefreshCw className="h-3 w-3" /> Resend
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => revokeInvitation(i.id))}
                    className="gap-1 text-xs text-destructive"
                  >
                    <XCircle className="h-3 w-3" /> Revoke
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
