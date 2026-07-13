'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Trash2, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { createJob, deleteJob, generateWh347 } from '@/app/actions/jobs'

type Worksite = { id: string; name: string }
type Job = {
  id: string
  name: string
  contract_number: string | null
  prevailing_wage: boolean
  worksite_id: string | null
  worksites: { name: string } | { name: string }[] | null
}

function one<T>(x: T | T[] | null): T | null {
  return Array.isArray(x) ? x[0] ?? null : x
}
function monday(): string {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() + ((day === 0 ? -6 : 1) - day))
  return d.toISOString().slice(0, 10)
}

export function JobsManager({ jobs, worksites }: { jobs: Job[]; worksites: Worksite[] }) {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [worksiteId, setWorksiteId] = useState('')
  const [contract, setContract] = useState('')
  const [prevailing, setPrevailing] = useState(false)
  const [weeks, setWeeks] = useState<Record<string, string>>({})

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res.success) router.refresh()
      else setError(res.error ?? 'Error')
    })
  }

  async function wh347(jobId: string) {
    setError(null)
    const week = weeks[jobId] ?? monday()
    const res = await generateWh347(jobId, week)
    if (res.success) {
      const a = document.createElement('a')
      a.href = `data:application/pdf;base64,${res.base64}`
      a.download = res.filename
      document.body.appendChild(a)
      a.click()
      a.remove()
    } else setError(res.error)
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Crear job */}
      <div className="grid gap-3 rounded-lg border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs">{t('jobs.name')}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Main St. Bridge" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('jobs.worksite')}</Label>
          <select value={worksiteId} onChange={(e) => setWorksiteId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
            <option value="">—</option>
            {worksites.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('jobs.contract')}</Label>
          <Input value={contract} onChange={(e) => setContract(e.target.value)} />
        </div>
        <div className="flex items-end justify-between gap-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={prevailing} onChange={(e) => setPrevailing(e.target.checked)} /> {t('jobs.prevailing')}</label>
          <Button className="gap-1" disabled={pending || !name.trim()} onClick={() => run(() => createJob({ name, worksiteId, contractNumber: contract, prevailingWage: prevailing }))}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Lista de jobs */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 font-semibold">{t('jobs.list')}</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('jobs.empty')}</p>
        ) : (
          <ul className="space-y-2">
            {jobs.map((job) => {
              const ws = one(job.worksites)
              return (
                <li key={job.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">
                      {job.name}{' '}
                      {job.prevailing_wage && <Badge variant="info">{t('jobs.prevailing')}</Badge>}
                    </p>
                    <p className="text-muted-foreground">
                      {ws?.name ?? t('jobs.noWorksite')}{job.contract_number ? ` · ${job.contract_number}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={weeks[job.id] ?? monday()}
                      onChange={(e) => setWeeks((w) => ({ ...w, [job.id]: e.target.value }))}
                      className="h-9 w-36"
                    />
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => wh347(job.id)}>
                      <FileDown className="h-4 w-4" /> WH-347
                    </Button>
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deleteJob(job.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
