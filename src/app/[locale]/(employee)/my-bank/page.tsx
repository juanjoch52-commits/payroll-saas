import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { BankForm } from '@/components/employee/BankForm'

export default async function MyBankPage({ params: { locale } }: { params: { locale: string } }) {
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

  const { data: bank } = empId
    ? await supabase
        .from('employee_bank_accounts')
        .select('account_last_four, account_type')
        .eq('employee_id', empId)
        .maybeSingle()
    : { data: null }

  return (
    <div className="container max-w-md py-6">
      <Link href={`/${locale}/profile`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="h-4 w-4" /> {t('paystub.back')}
      </Link>
      <h1 className="mb-4 text-2xl font-bold">{t('bank.myTitle')}</h1>
      <BankForm
        current={
          (bank as { account_last_four: string | null; account_type: string } | null) ?? null
        }
      />
    </div>
  )
}
