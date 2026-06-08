'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createDepartment, deleteDepartment, setEmployeeDepartment } from '@/app/actions/departments'

type Dept = { id: string; name: string }
type Employee = { id: string; first_name: string; last_name: string; department_id: string | null }

export function DepartmentsManager({
  departments,
  employees,
}: {
  departments: Dept[]
  employees: Employee[]
}) {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res.success) router.refresh()
      else setError(res.error ?? 'Error')
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {error && <p className="text-sm text-destructive lg:col-span-2">{error}</p>}

      {/* Departamentos */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 font-semibold">{t('departments.list')}</h2>
        <div className="mb-3 flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kitchen" />
          <Button className="gap-1" disabled={pending || !name.trim()} onClick={() => run(async () => { const r = await createDepartment(name); if (r.success) setName(''); return r })}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {departments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('departments.none')}</p>
        ) : (
          <ul className="space-y-2">
            {departments.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="font-medium">{d.name}</span>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deleteDepartment(d.id))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Asignar empleados */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 font-semibold">{t('departments.assign')}</h2>
        <ul className="space-y-2">
          {employees.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
              <span>{e.first_name} {e.last_name}</span>
              <select
                value={e.department_id ?? ''}
                onChange={(ev) => run(() => setEmployeeDepartment(e.id, ev.target.value))}
                disabled={pending}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">—</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </li>
          ))}
          {employees.length === 0 && <li className="text-sm text-muted-foreground">—</li>}
        </ul>
      </div>
    </div>
  )
}
