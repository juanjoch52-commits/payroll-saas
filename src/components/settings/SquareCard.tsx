'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Store, Lock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { connectSquare, disconnectSquare, getSquareTipTotals } from '@/app/actions/square'

export function SquareCard({
  locale,
  hasFeature,
  serverConfigured,
  status,
}: {
  locale: string
  hasFeature: boolean
  serverConfigured: boolean
  status: string | null
}) {
  const t = useTranslations()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(today)
  const [totals, setTotals] = useState<Record<string, number> | null>(null)
  const [mock, setMock] = useState(false)
  const connected = status === 'active'

  function connect() {
    setError(null)
    startTransition(async () => {
      const res = await connectSquare(locale)
      if (res.success) window.location.href = res.url
      else setError(res.error)
    })
  }

  function pull() {
    setError(null)
    setTotals(null)
    startTransition(async () => {
      const res = await getSquareTipTotals(start, end)
      if (res.success) {
        setTotals(res.byDate)
        setMock(res.mock)
      } else setError(res.error)
    })
  }

  if (!hasFeature) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" /> Square POS</CardTitle>
              <CardDescription>{t('square.desc')}</CardDescription>
            </div>
            <Badge variant="warning" className="gap-1"><Lock className="h-3 w-3" /> {t('quickbooks.planTag')}</Badge>
          </div>
        </CardHeader>
        <CardContent><Button disabled>{t('quickbooks.upgrade')}</Button></CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" /> Square POS</CardTitle>
            <CardDescription>{t('square.desc')}</CardDescription>
          </div>
          <Badge variant={connected ? 'success' : 'muted'}>
            {connected ? t('quickbooks.connected') : t('quickbooks.notConnected')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!serverConfigured && (
          <p className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm text-muted-foreground">
            {t('square.serverNote')}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {connected ? (
            <Button variant="outline" onClick={() => startTransition(async () => { await disconnectSquare() })} disabled={pending}>
              {t('quickbooks.disconnect')}
            </Button>
          ) : (
            <Button onClick={connect} disabled={pending || !serverConfigured}>{t('square.connect')}</Button>
          )}
        </div>

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">{t('square.tipTotals')}</p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1"><Label className="text-xs">{t('square.from')}</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">{t('square.to')}</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9" /></div>
            <Button size="sm" onClick={pull} disabled={pending}>{t('square.pull')}</Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {totals && (
            <div className="rounded-md border p-3 text-sm">
              {mock && <p className="mb-1 text-xs text-muted-foreground">{t('square.mockNote')}</p>}
              {Object.keys(totals).length === 0 ? (
                <p className="text-muted-foreground">{t('square.noTips')}</p>
              ) : (
                <ul className="space-y-1">
                  {Object.entries(totals).map(([day, cents]) => (
                    <li key={day} className="flex justify-between">
                      <span>{day}</span>
                      <span className="font-semibold">${(cents / 100).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-muted-foreground">{t('square.distributeHint')}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
