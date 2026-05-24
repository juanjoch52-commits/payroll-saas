'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Membership = {
  organization_id: string
  organizations: { name: string } | { name: string }[]
}

/**
 * Dropdown para cambiar de organización (cuando el user pertenece a varias).
 *
 * Al elegir, actualiza `user_metadata.active_org_id` en Supabase Auth para
 * que el JWT custom_access_token_hook lo refleje. Luego refresh.
 */
export function OrgSwitcher({
  currentOrgId,
  currentOrgName,
  memberships,
}: {
  currentOrgId: string
  currentOrgName: string
  memberships: Membership[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  // Si solo hay una org, mostrar solo el nombre sin dropdown.
  if (memberships.length <= 1) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{currentOrgName}</span>
      </div>
    )
  }

  function switchTo(orgId: string) {
    setOpen(false)
    startTransition(async () => {
      const supabase = createClient()
      await supabase.auth.updateUser({ data: { active_org_id: orgId } })
      router.refresh()
    })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent"
        disabled={pending}
      >
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{currentOrgName}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-56 rounded-md border bg-popover py-1 shadow-md">
          {memberships.map((m) => {
            const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations
            const isCurrent = m.organization_id === currentOrgId
            return (
              <button
                key={m.organization_id}
                onClick={() => switchTo(m.organization_id)}
                className={
                  'w-full px-3 py-2 text-left text-sm hover:bg-accent ' +
                  (isCurrent ? 'font-medium' : '')
                }
              >
                {org?.name ?? '—'}
                {isCurrent && <span className="ml-2 text-xs text-primary">●</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
