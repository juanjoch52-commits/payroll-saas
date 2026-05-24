'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { createBroadcast } from '@/app/actions/broadcast'

export function BroadcastComposer() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [channels, setChannels] = useState({
    inapp: true,
    email: false,
    sms: false,
    push: false,
  })
  const [targetType, setTargetType] = useState<'all' | 'plan' | 'tenant' | 'role'>('all')

  function handleSubmit(formData: FormData) {
    formData.append('channels', JSON.stringify(Object.entries(channels).filter(([, v]) => v).map(([k]) => k)))
    startTransition(async () => {
      const res = await createBroadcast(formData)
      if (res.success) {
        toast.success('Broadcast queued for delivery')
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">Compose broadcast</h2>

        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="target_type">Target</Label>
              <select
                id="target_type"
                name="target_type"
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as typeof targetType)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">All tenants</option>
                <option value="plan">By plan</option>
                <option value="tenant">Specific tenant</option>
                <option value="role">By role</option>
              </select>
            </div>
            {targetType !== 'all' && (
              <div className="space-y-1.5">
                <Label htmlFor="target_value">
                  {targetType === 'plan' && 'Plan code'}
                  {targetType === 'tenant' && 'Organization ID'}
                  {targetType === 'role' && 'Role'}
                </Label>
                <Input
                  id="target_value"
                  name="target_value"
                  placeholder={
                    targetType === 'plan'
                      ? 'esencial / avanzado / premium'
                      : targetType === 'tenant'
                        ? 'UUID'
                        : 'owner / admin / employee'
                  }
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required maxLength={120} placeholder="Scheduled maintenance" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="body">Message</Label>
            <textarea
              id="body"
              name="body"
              required
              rows={4}
              className="w-full rounded-md border bg-background p-3 text-sm"
              placeholder="We'll be deploying an update on Sunday from 10pm to 11pm PST. No downtime expected."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cta_label">CTA label (optional)</Label>
              <Input id="cta_label" name="cta_label" placeholder="View details" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cta_url">CTA URL (optional)</Label>
              <Input id="cta_url" name="cta_url" placeholder="https://..." type="url" />
            </div>
          </div>

          <div>
            <Label>Delivery channels</Label>
            <div className="mt-2 flex flex-wrap gap-4">
              {Object.entries(channels).map(([ch, on]) => (
                <label key={ch} className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={on}
                    onCheckedChange={(v) => setChannels((c) => ({ ...c, [ch]: v }))}
                  />
                  <span className="capitalize">{ch}</span>
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={pending} className="gap-2">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {pending ? 'Sending...' : 'Send broadcast'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
