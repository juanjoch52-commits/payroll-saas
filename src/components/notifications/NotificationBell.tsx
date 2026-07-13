'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createClient } from '@/lib/supabase/client'

type Notification = {
  id: string
  type: string
  title: string
  body: string
  cta_url: string | null
  read_at: string | null
  created_at: string
}

/**
 * Campana de notificaciones con badge contador + dropdown con feed.
 * Suscrita a Supabase Realtime para push instant cuando llega una notif.
 */
export function NotificationBell({ userId, locale }: { userId: string; locale: string }) {
  const t = useTranslations('common')
  const [items, setItems] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, body, cta_url, read_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
      setItems((data ?? []) as Notification[])
      setUnread((data ?? []).filter((n) => !n.read_at).length)
    }

    load()

    // Realtime subscription
    const channel = supabase
      .channel(`notif:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as Notification
          setItems((prev) => [n, ...prev].slice(0, 20))
          setUnread((u) => u + 1)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  async function markAllRead() {
    const supabase = createClient()
    const ids = items.filter((i) => !i.read_at).map((i) => i.id)
    if (ids.length === 0) return
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids)
    setItems((prev) =>
      prev.map((p) => (p.read_at ? p : { ...p, read_at: new Date().toISOString() })),
    )
    setUnread(0)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-medium text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="h-80">
          {items.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              {t('noData')}
            </div>
          ) : (
            items.map((n) => (
              <DropdownMenuItem key={n.id} asChild className="cursor-pointer">
                <Link
                  href={n.cta_url ?? '#'}
                  className="flex flex-col items-start gap-1 px-3 py-2.5"
                >
                  <div className="flex w-full items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${n.read_at ? 'bg-muted-foreground/40' : 'bg-primary'}`}
                    />
                    <p className="flex-1 text-sm font-medium">{n.title}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {formatRelative(n.created_at)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                </Link>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
        <div className="border-t p-2">
          <Link
            href={`/${locale}/settings/notifications`}
            className="block w-full rounded-md px-3 py-1.5 text-center text-xs text-muted-foreground hover:bg-accent"
          >
            Notification preferences
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function formatRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}
