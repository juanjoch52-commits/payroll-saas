import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { MyTimeOff } from '@/components/employee/MyTimeOff'

export default async function MyTimeOffPage({
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

  const { data: balances } = empId
    ? await supabase
        .from('pto_balances')
        .select('balance_hours, pto_policies(name, pto_type)')
        .eq('employee_id', empId)
    : { data: [] }

  const { data: policies } = await supabase
    .from('pto_policies')
    .select('id, name')
    .eq('organization_id', session.organizationId)
    .eq('is_active', true)
    .order('name')

  const { data: myRequests } = empId
    ? await supabase
        .from('time_off_requests')
        .select('id, start_date, end_date, hours, status')
        .eq('employee_id', empId)
        .order('start_date', { ascending: false })
        .limit(20)
    : { data: [] }

  return (
    <div className="container max-w-md py-6">
      <Link href={`/${locale}/profile`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="h-4 w-4" /> {t('paystub.back')}
      </Link>
      <h1 className="mb-4 text-2xl font-bold">{t('timeOff.myTitle')}</h1>
      <MyTimeOff
        balances={(balances ?? []) as never}
        policies={(policies ?? []) as never}
        requests={(myRequests ?? []) as never}
      />
    </div>
  )
}
