'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Upload, Trash2, Download, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { uploadDocument, deleteDocument, getDocumentUrl } from '@/app/actions/documents'

type Person = { first_name: string; last_name: string }
type Doc = {
  id: string
  name: string
  kind: string
  storage_path: string | null
  requires_signature: boolean
  employee_id: string | null
  employees: Person | Person[] | null
  document_signatures: { id: string }[] | null
}
type Employee = { id: string; first_name: string; last_name: string }

function one<T>(x: T | T[] | null): T | null {
  return Array.isArray(x) ? x[0] ?? null : x
}

export function DocumentsManager({
  documents,
  employees,
}: {
  documents: Doc[]
  employees: Employee[]
}) {
  const t = useTranslations()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res.success) router.refresh()
      else setError(res.error ?? 'Error')
    })
  }

  function handleUpload(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const res = await uploadDocument(formData)
      if (res.success) router.refresh()
      else setError(res.error ?? 'Error')
    })
  }

  async function download(id: string) {
    const res = await getDocumentUrl(id)
    if (res.success) window.open(res.url, '_blank')
    else setError(res.error)
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Subir documento */}
      <form action={handleUpload} className="grid gap-3 rounded-lg border bg-card p-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">{t('documents.name')}</Label>
          <Input name="name" required placeholder="Manual del empleado" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('documents.kind')}</Label>
          <select name="kind" defaultValue="other" className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
            <option value="offer_letter">{t('documents.kinds.offer_letter')}</option>
            <option value="handbook">{t('documents.kinds.handbook')}</option>
            <option value="policy">{t('documents.kinds.policy')}</option>
            <option value="tax_form">{t('documents.kinds.tax_form')}</option>
            <option value="contract">{t('documents.kinds.contract')}</option>
            <option value="id_doc">{t('documents.kinds.id_doc')}</option>
            <option value="other">{t('documents.kinds.other')}</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('documents.assignTo')}</Label>
          <select name="employeeId" defaultValue="" className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
            <option value="">{t('documents.everyone')}</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('documents.file')}</Label>
          <Input name="file" type="file" accept="application/pdf,image/*" />
        </div>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" name="requiresSignature" value="true" /> {t('documents.requireSignature')}
        </label>
        <div className="flex items-end">
          <Button type="submit" disabled={pending} className="w-full gap-1">
            <Upload className="h-4 w-4" /> {t('documents.upload')}
          </Button>
        </div>
      </form>

      {/* Lista */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 font-semibold">{t('documents.library')}</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('documents.empty')}</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => {
              const emp = one(doc.employees)
              const sigCount = doc.document_signatures?.length ?? 0
              return (
                <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{doc.name}</p>
                    <p className="text-muted-foreground">
                      {t(`documents.kinds.${doc.kind}` as 'documents.kinds.other')} ·{' '}
                      {emp ? `${emp.first_name} ${emp.last_name}` : t('documents.everyone')}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {doc.requires_signature && (
                      <Badge variant={sigCount > 0 ? 'success' : 'warning'} className="gap-1">
                        <PenLine className="h-3 w-3" /> {sigCount}
                      </Badge>
                    )}
                    {doc.storage_path && (
                      <Button size="sm" variant="ghost" onClick={() => download(doc.id)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deleteDocument(doc.id))}>
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
