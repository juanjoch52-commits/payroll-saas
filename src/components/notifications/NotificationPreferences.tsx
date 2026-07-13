'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { subscribeToPush, unsubscribeFromPush } from '@/lib/push/register'

type Channel = 'inapp' | 'email' | 'sms' | 'push'

const TYPES = [
  { id: 'payroll_ready', label: 'Payroll is ready to review' },
  { id: 'payroll_failed', label: 'Payroll calculation failed' },
  { id: 'payroll_approved', label: 'Payroll approved' },
  { id: 'time_entry_pending', label: 'New time entry awaits approval' },
  { id: 'time_entry_rejected', label: 'My time entry was rejected' },
  { id: 'clock_anomaly', label: 'Clock-in flagged outside worksite' },
  { id: 'tax_form_ready', label: 'Tax form is ready' },
  { id: 'broadcast', label: 'MyJova announcements' },
  { id: 'support_reply', label: 'Reply on my support ticket' },
  { id: 'payment_failed', label: 'Payment failed' },
  { id: 'trial_ending', label: 'Trial is about to end' },
] as const

const CHANNELS: { id: Channel; label: string }[] = [
  { id: 'inapp', label: 'In-app' },
  { id: 'email', label: 'Email' },
  { id: 'sms', label: 'SMS' },
  { id: 'push', label: 'Push' },
]

export function NotificationPreferences({
  userId,
  initialPrefs,
}: {
  userId: string
  initialPrefs: { type: string; channel: string; enabled: boolean }[]
}) {
  const [prefs, setPrefs] = useState(() => {
    const map = new Map<string, boolean>()
    for (const p of initialPrefs) map.set(`${p.type}:${p.channel}`, p.enabled)
    return map
  })
  const [, startTransition] = useTransition()
  const [pushReady, setPushReady] = useState(false)

  function isOn(type: string, channel: Channel): boolean {
    const key = `${type}:${channel}`
    if (prefs.has(key)) return prefs.get(key)!
    // Default: in-app on, push on, email selective, sms off
    if (channel === 'inapp') return true
    if (channel === 'push') return ['payroll_ready', 'time_entry_pending', 'clock_anomaly', 'broadcast', 'support_reply'].includes(type)
    if (channel === 'email')
      return ['payroll_ready', 'payroll_failed', 'tax_form_ready', 'broadcast', 'payment_failed', 'trial_ending', 'support_reply'].includes(
        type,
      )
    return false
  }

  function toggle(type: string, channel: Channel) {
    const key = `${type}:${channel}`
    const next = !isOn(type, channel)
    const updated = new Map(prefs)
    updated.set(key, next)
    setPrefs(updated)

    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.from('notification_preferences').upsert(
        { user_id: userId, type, channel, enabled: next },
        { onConflict: 'user_id,type,channel' },
      )
      if (error) {
        toast.error(`Could not save: ${error.message}`)
        // Revert local state
        const reverted = new Map(prefs)
        reverted.delete(key)
        setPrefs(reverted)
      }
    })
  }

  async function enablePush() {
    const res = await subscribeToPush()
    if (res.ok) {
      setPushReady(true)
      toast.success('Push notifications enabled')
    } else {
      toast.error(res.error)
    }
  }

  async function disablePush() {
    await unsubscribeFromPush()
    setPushReady(false)
    toast.success('Push disabled')
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Browser push notifications</p>
              <p className="text-sm text-muted-foreground">
                Get realtime alerts on this device even when the tab is closed.
              </p>
            </div>
          </div>
          {pushReady ? (
            <Button variant="outline" onClick={disablePush}>Disable</Button>
          ) : (
            <Button onClick={enablePush}>Enable</Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Event</th>
                  {CHANNELS.map((c) => (
                    <th key={c.id} className="px-4 py-3 text-center font-medium">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TYPES.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{t.label}</td>
                    {CHANNELS.map((c) => (
                      <td key={c.id} className="px-4 py-3 text-center">
                        <Switch
                          checked={isOn(t.id, c.id)}
                          onCheckedChange={() => toggle(t.id, c.id)}
                          aria-label={`${t.label} · ${c.label}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
