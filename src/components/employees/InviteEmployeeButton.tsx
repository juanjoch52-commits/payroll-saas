'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Send } from 'lucide-react'
import { createInvitation } from '@/app/actions/invitations'
import { Button } from '@/components/ui/button'

export function InviteEmployeeButton({
  employeeId,
  email,
  locale,
}: {
  employeeId: string
  email: string
  locale: string
}) {
  const t = useTranslations()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleClick() {
    setError(null)
    const fd = new FormData()
    fd.set('email', email)
    fd.set('role', 'employee')
    fd.set('employeeId', employeeId)

    startTransition(async () => {
      const res = await createInvitation(fd)
      if (res.success) setSent(true)
      else setError(res.error)
    })
  }

  if (sent) {
    return (
      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        Invitation sent
      </span>
    )
  }

  return (
    <div className="text-right">
      <Button onClick={handleClick} disabled={pending}>
        <Send className="mr-2 h-4 w-4" />
        {pending ? t('common.loading') : 'Invite to portal'}
      </Button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}
