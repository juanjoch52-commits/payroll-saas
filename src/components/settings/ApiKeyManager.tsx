'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { createApiKey, revokeApiKey } from '@/app/actions/api-keys'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ApiKey = {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

const AVAILABLE_SCOPES = [
  'employees:read',
  'employees:write',
  'payroll:read',
  'payroll:write',
]

export function ApiKeyManager({ keys }: { keys: ApiKey[] }) {
  const t = useTranslations()
  const [newKey, setNewKey] = useState<{ key: string; prefix: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleCreate(formData: FormData) {
    setError(null)
    setNewKey(null)
    startTransition(async () => {
      const res = await createApiKey(formData)
      if (res.success) {
        setNewKey({ key: res.key, prefix: res.prefix })
      } else {
        setError(res.error)
      }
    })
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      await revokeApiKey(id)
    })
  }

  return (
    <div className="space-y-6">
      <form action={handleCreate} className="space-y-4 rounded-md border bg-muted/30 p-4">
        <div className="space-y-2">
          <Label htmlFor="name">Key name</Label>
          <Input id="name" name="name" placeholder="MyRavex Production" required />
        </div>
        <div className="space-y-2">
          <Label>Scopes</Label>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_SCOPES.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="scopes" value={s} defaultChecked={s === 'employees:read'} />
                <code className="rounded bg-muted px-1 text-xs">{s}</code>
              </label>
            ))}
          </div>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? t('common.loading') : 'Generate key'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>

      {newKey && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Save this key now — it won&apos;t be shown again.
          </p>
          <code className="mt-2 block break-all rounded bg-white p-2 text-xs">{newKey.key}</code>
        </div>
      )}

      <div className="rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Prefix</th>
              <th className="px-4 py-3 font-medium">Last used</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{k.name}</td>
                <td className="px-4 py-3">
                  <code className="text-xs">{k.key_prefix}…</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-4 py-3">
                  {k.revoked_at ? (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">Revoked</span>
                  ) : (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {!k.revoked_at && (
                    <Button variant="ghost" size="sm" onClick={() => handleRevoke(k.id)}>
                      Revoke
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No API keys yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
