import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { MyDocuments } from '@/components/employee/MyDocuments'

export default async function MyDocumentsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()
  const session = await requireSession(`/${locale}/login`)
  const supabase = createClient()

  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', session.userId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  const empId = (emp as { id: string } | null)?.id

  const { data: documents } = await supabase
    .from('documents')
    .select('id, name, kind, storage_path, requires_signature')
    .eq('organization_id', session.organizationId)
    .order('created_at', { ascending: false })

  const { data: sigs } = empId
    ? await supabase.from('document_signatures').select('document_id').eq('employee_id', empId)
    : { data: [] }
  const signed = new Set((sigs ?? []).map((s: { document_id: string }) => s.document_id))

  const docs = (documents ?? []).map((d: { id: string; name: string; kind: string; storage_path: string | null; requires_signature: boolean }) => ({
    ...d,
    signed: signed.has(d.id),
  }))

  return (
    <div className="container max-w-md py-6">
      <Link href={`/${locale}/profile`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="h-4 w-4" /> {t('paystub.back')}
      </Link>
      <h1 className="mb-4 text-2xl font-bold">{t('documents.myTitle')}</h1>
      <MyDocuments docs={docs as never} />
    </div>
  )
}
