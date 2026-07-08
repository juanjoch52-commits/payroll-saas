'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { createSubcontractor, toggleSubcontractor } from '@/app/actions/subcontractors'

export type SubRow = {
  id: string
  parent_id: string | null
  name: string
  contact_name: string | null
  email: string | null
  sales_tax_pct: number | null
  is_active: boolean
  workerCount: number
}

/** Ordena el árbol en preorden (raíces primero, hijos indentados). */
function flattenTree(rows: SubRow[]): { row: SubRow; depth: number }[] {
  const children = new Map<string | null, SubRow[]>()
  for (const r of rows) {
    const key = r.parent_id && rows.some((x) => x.id === r.parent_id) ? r.parent_id : null
    const arr = children.get(key) ?? []
    arr.push(r)
    children.set(key, arr)
  }
  const out: { row: SubRow; depth: number }[] = []
  const walk = (parent: string | null, depth: number) => {
    for (const r of (children.get(parent) ?? []).sort((a, b) => a.name.localeCompare(b.name))) {
      out.push({ row: r, depth })
      if (depth < 10) walk(r.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}

export function SubcontractorsManager({ subs }: { subs: SubRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [salesTaxPct, setSalesTaxPct] = useState('')

  function add() {
    setError(null)
    startTransition(async () => {
      const res = await createSubcontractor({ name, parentId, contactName, email, salesTaxPct })
      if (res.success) {
        setName('')
        setParentId('')
        setContactName('')
        setEmail('')
        setSalesTaxPct('')
        router.refresh()
      } else {
        setError(res.error ?? 'Error')
      }
    })
  }

  function toggle(id: string, active: boolean) {
    startTransition(async () => {
      await toggleSubcontractor(id, active)
      router.refresh()
    })
  }

  const tree = flattenTree(subs)

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Subcontractor</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Workers</th>
              <th className="px-4 py-3 font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {tree.map(({ row, depth }) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">
                  <span style={{ paddingLeft: depth * 20 }}>
                    {depth > 0 && <span className="mr-1 text-muted-foreground">└</span>}
                    {row.name}
                  </span>
                  {depth === 0 && (
                    <Badge variant="info" className="ml-2 text-[10px]">
                      gets the check
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.contact_name ?? '—'}
                  {row.email && <span className="ml-1 text-xs">({row.email})</span>}
                  {depth === 0 && Number(row.sales_tax_pct) > 0 && (
                    <span className="ml-2 text-xs">· HST {Number(row.sales_tax_pct)}%</span>
                  )}
                </td>
                <td className="px-4 py-3">{row.workerCount}</td>
                <td className="px-4 py-3">
                  <Switch
                    checked={row.is_active}
                    onCheckedChange={(v) => toggle(row.id, v)}
                    disabled={pending}
                    aria-label={`Toggle ${row.name}`}
                  />
                </td>
              </tr>
            ))}
            {tree.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                  No subcontractors yet. Add your first one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 rounded-md border bg-muted/20 p-4">
        <p className="text-sm font-medium">Add subcontractor</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="sub-name" className="text-xs">
              Company name
            </Label>
            <Input id="sub-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Beta Plumbing LLC" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sub-parent" className="text-xs">
              Reports to (optional — payment rolls up to the top)
            </Label>
            <select
              id="sub-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Top level (paid directly) —</option>
              {subs
                .filter((s) => s.is_active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="sub-contact" className="text-xs">
              Contact (optional)
            </Label>
            <Input id="sub-contact" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sub-email" className="text-xs">
              Email (optional)
            </Label>
            <Input id="sub-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sub-tax" className="text-xs">
              HST/GST % on the check (e.g. 13 for Ontario — top-level subs only)
            </Label>
            <Input
              id="sub-tax"
              type="number"
              step="0.01"
              min={0}
              max={30}
              value={salesTaxPct}
              onChange={(e) => setSalesTaxPct(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        <Button onClick={add} disabled={pending || name.trim().length < 2} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          {pending ? 'Saving…' : 'Add subcontractor'}
        </Button>
      </div>
    </div>
  )
}
