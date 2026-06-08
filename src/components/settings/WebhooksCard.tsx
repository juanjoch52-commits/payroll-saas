'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Webhook, Trash2, Copy, Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { WEBHOOK_EVENTS, WEBHOOK_EVENT_LABELS, type WebhookEvent } from '@/lib/webhooks/events'
import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  toggleWebhookEndpoint,
} from '@/app/actions/webhooks'

type Endpoint = {
  id: string
  url: string
  description: string | null
  events: string[]
  is_active: boolean
}

export function WebhooksCard({ endpoints }: { endpoints: Endpoint[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<WebhookEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function toggleEvent(ev: WebhookEvent) {
    setSelected((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]))
  }

  function handleCreate() {
    setError(null)
    setNewSecret(null)
    startTransition(async () => {
      const res = await createWebhookEndpoint({ url, description, events: selected })
      if (res.success) {
        setNewSecret(res.secret)
        setUrl('')
        setDescription('')
        setSelected([])
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  function handleToggle(id: string, isActive: boolean) {
    startTransition(async () => {
      await toggleWebhookEndpoint(id, isActive)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteWebhookEndpoint(id)
      router.refresh()
    })
  }

  async function copySecret() {
    if (!newSecret) return
    await navigator.clipboard.writeText(newSecret)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          Outbound webhooks
        </CardTitle>
        <CardDescription>
          Send signed HTTP POSTs to your systems when payroll is approved, a time entry is
          approved, or an employee is created. Each request is signed with HMAC-SHA256 in the{' '}
          <code className="text-xs">X-MyJova-Signature</code> header.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Secret recién creado — se muestra una sola vez */}
        {newSecret && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
            <p className="mb-2 font-medium">Signing secret — copy it now, it won&apos;t be shown again:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-background px-2 py-1 text-xs">{newSecret}</code>
              <Button type="button" variant="outline" size="sm" onClick={copySecret}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* Lista de endpoints existentes */}
        {endpoints.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {endpoints.map((ep) => (
              <li key={ep.id} className="flex items-start justify-between gap-4 p-3">
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-mono text-sm">{ep.url}</p>
                  {ep.description && (
                    <p className="text-xs text-muted-foreground">{ep.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {ep.events.map((e) => (
                      <Badge key={e} variant="secondary" className="text-[10px]">
                        {WEBHOOK_EVENT_LABELS[e as WebhookEvent] ?? e}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Switch
                    checked={ep.is_active}
                    onCheckedChange={(v) => handleToggle(ep.id, v)}
                    disabled={pending}
                    aria-label="Toggle endpoint active"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(ep.id)}
                    disabled={pending}
                    aria-label="Delete endpoint"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No endpoints yet.</p>
        )}

        {/* Form para añadir endpoint */}
        <div className="space-y-3 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Endpoint URL</Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://example.com/webhooks/myjova"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhook-desc">Description (optional)</Label>
            <Input
              id="webhook-desc"
              placeholder="e.g. Accounting sync"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Events</Label>
            <div className="flex flex-wrap gap-3">
              {WEBHOOK_EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={selected.includes(ev)}
                    onChange={() => toggleEvent(ev)}
                  />
                  {WEBHOOK_EVENT_LABELS[ev]}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="button" onClick={handleCreate} disabled={pending || !url || selected.length === 0}>
            {pending ? 'Saving…' : 'Add endpoint'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
