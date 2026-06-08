'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { replyToTicket, setTicketStatus, type TicketStatus } from '@/app/actions/support'

const STATUSES: TicketStatus[] = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed']

export function TicketActions({
  ticketId,
  currentStatus,
}: {
  ticketId: string
  currentStatus: TicketStatus
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function send() {
    setError(null)
    startTransition(async () => {
      const res = await replyToTicket(ticketId, body)
      if (res.success) {
        setBody('')
        router.refresh()
      } else {
        setError(res.error ?? 'Error')
      }
    })
  }

  function changeStatus(status: TicketStatus) {
    startTransition(async () => {
      await setTicketStatus(ticketId, status)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="ticket-status" className="text-sm font-medium">
          Status
        </label>
        <select
          id="ticket-status"
          value={currentStatus}
          onChange={(e) => changeStatus(e.target.value as TicketStatus)}
          disabled={pending}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm capitalize"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Write a reply to the tenant…"
          className="w-full rounded-md border border-input bg-background p-3 text-sm"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button onClick={send} disabled={pending || !body.trim()} className="gap-2">
            <Send className="h-4 w-4" />
            {pending ? 'Sending…' : 'Send reply'}
          </Button>
        </div>
      </div>
    </div>
  )
}
