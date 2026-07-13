'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { setFeatureOverride, removeFeatureOverride } from '@/app/actions/feature-overrides'

type Override = {
  flag_key: string
  enabled: boolean
  reason: string | null
  expires_at: string | null
}

// Sugerencias de claves conocidas (el campo admite texto libre).
const KNOWN_FLAGS = [
  'quickbooks_integration',
  'myravex_integration',
  'square_integration',
  'api_keys',
  'payroll_daily',
  'payroll_commission',
  'payroll_piecerate',
  'advanced_reports',
  'sso',
]

export function FeatureOverridesManager({
  orgId,
  overrides,
}: {
  orgId: string
  overrides: Override[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [flagKey, setFlagKey] = useState('')
  const [enabled, setEnabled] = useState('true')
  const [reason, setReason] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [error, setError] = useState<string | null>(null)

  function add() {
    setError(null)
    startTransition(async () => {
      const res = await setFeatureOverride({
        orgId,
        flagKey,
        enabled: enabled === 'true',
        reason,
        expiresAt: expiresAt || null,
      })
      if (res.success) {
        setFlagKey('')
        setReason('')
        setExpiresAt('')
        router.refresh()
      } else {
        setError(res.error ?? 'Error')
      }
    })
  }

  function remove(key: string) {
    startTransition(async () => {
      await removeFeatureOverride(orgId, key)
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {overrides.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No overrides. Tenant gets exactly what their plan defines.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2 text-left">Flag</th>
              <th className="py-2 text-left">Enabled</th>
              <th className="py-2 text-left">Reason</th>
              <th className="py-2 text-left">Expires</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {overrides.map((o) => (
              <tr key={o.flag_key} className="border-b last:border-0">
                <td className="py-2 font-mono text-xs">{o.flag_key}</td>
                <td className="py-2">
                  <Badge variant={o.enabled ? 'success' : 'destructive'}>
                    {o.enabled ? 'on' : 'off'}
                  </Badge>
                </td>
                <td className="py-2 text-muted-foreground">{o.reason ?? '—'}</td>
                <td className="py-2 text-muted-foreground">
                  {o.expires_at ? new Date(o.expires_at).toLocaleDateString() : 'never'}
                </td>
                <td className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => remove(o.flag_key)}
                    aria-label={`Remove ${o.flag_key}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add / update override */}
      <div className="space-y-3 rounded-md border bg-muted/20 p-4">
        <p className="text-sm font-medium">Add or update an override</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="flag-key" className="text-xs">
              Flag key
            </Label>
            <Input
              id="flag-key"
              list="known-flags"
              value={flagKey}
              onChange={(e) => setFlagKey(e.target.value)}
              placeholder="e.g. quickbooks_integration"
            />
            <datalist id="known-flags">
              {KNOWN_FLAGS.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1">
            <Label htmlFor="flag-enabled" className="text-xs">
              State
            </Label>
            <select
              id="flag-enabled"
              value={enabled}
              onChange={(e) => setEnabled(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="flag-reason" className="text-xs">
              Reason (optional)
            </Label>
            <Input
              id="flag-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Beta access, courtesy…"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="flag-expires" className="text-xs">
              Expires (optional)
            </Label>
            <Input
              id="flag-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={add} disabled={pending || !flagKey.trim()} className="gap-2" size="sm">
          <Plus className="h-4 w-4" />
          {pending ? 'Saving…' : 'Save override'}
        </Button>
      </div>
    </div>
  )
}
