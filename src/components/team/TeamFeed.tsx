'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Megaphone, Send, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { postAnnouncement, markAnnouncementRead, postMessage } from '@/app/actions/team'

type Announcement = { id: string; title: string; body: string; created_at: string; read: boolean }
type Message = { id: string; author_name: string | null; body: string; created_at: string }

export function TeamFeed({
  canPostAnnouncements,
  announcements,
  messages,
}: {
  canPostAnnouncements: boolean
  announcements: Announcement[]
  messages: Message[]
}) {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [msg, setMsg] = useState('')

  function run(fn: () => Promise<{ success: boolean; error?: string }>, after?: () => void) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res.success) {
        after?.()
        router.refresh()
      } else setError(res.error ?? 'Error')
    })
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Anuncios */}
      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <Megaphone className="h-5 w-5" /> {t('team.announcements')}
        </h2>
        {canPostAnnouncements && (
          <div className="mb-4 space-y-2 rounded-md border p-3">
            <Input placeholder={t('team.announceTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea
              placeholder={t('team.announceBody')}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-background p-2 text-sm"
            />
            <Button size="sm" disabled={pending || !title.trim() || !body.trim()} onClick={() => run(() => postAnnouncement({ title, body }), () => { setTitle(''); setBody('') })}>
              {t('team.post')}
            </Button>
          </div>
        )}
        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('team.noAnnouncements')}</p>
        ) : (
          <ul className="space-y-2">
            {announcements.map((a) => (
              <li key={a.id} className={'rounded-md border p-3 ' + (a.read ? '' : 'border-primary/40 bg-primary/5')}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{a.title}</p>
                    <p className="text-sm text-muted-foreground">{a.body}</p>
                  </div>
                  {!a.read && !canPostAnnouncements && (
                    <Button size="sm" variant="ghost" className="gap-1" onClick={() => run(() => markAnnouncementRead(a.id))}>
                      <Check className="h-4 w-4" /> {t('team.markRead')}
                    </Button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Tablón de mensajes */}
      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 font-semibold">{t('team.board')}</h2>
        <div className="mb-3 flex gap-2">
          <Input placeholder={t('team.writeMessage')} value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && msg.trim()) run(() => postMessage(msg), () => setMsg('')) }} />
          <Button className="gap-1" disabled={pending || !msg.trim()} onClick={() => run(() => postMessage(msg), () => setMsg(''))}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('team.noMessages')}</p>
        ) : (
          <ul className="space-y-2">
            {messages.map((m) => (
              <li key={m.id} className="rounded-md border px-3 py-2 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{m.author_name ?? '—'}</span>
                  <span className="text-[11px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                </div>
                <p className="text-muted-foreground">{m.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
