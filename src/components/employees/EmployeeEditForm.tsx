'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { updateEmployee } from '@/app/actions/employees'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LOCALITY_CODES, localityName } from '@/lib/payroll/us/local'

export type EmployeeEditDefaults = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  hire_date: string
  employee_type: string
  job_title: string | null
  primary_jurisdiction_code: string
  locality_code: string | null
  subcontractor_id: string | null
  w4_filing_status: string
  w4_dependents: number
  tax_id_last_four: string | null
}

/**
 * Edición de empleado (datos personales/fiscales). El pay scheme se cambia en
 * un flujo aparte (versionado). El SSN solo se envía si se escribe uno nuevo.
 */
export function EmployeeEditForm({
  employee,
  billRateCents = null,
  jurisdictions,
  subcontractors = [],
  locale,
}: {
  employee: EmployeeEditDefaults
  /** Facturado a la empresa ($/h) — viene de employee_billing (privada). */
  billRateCents?: number | null
  jurisdictions: { code: string; name: string }[]
  subcontractors?: { id: string; name: string }[]
  locale: string
}) {
  const t = useTranslations()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await updateEmployee(employee.id, formData)
      if (res.success) {
        router.push(`/${locale}/employees/${employee.id}`)
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  const inputCls =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">{t('employees.firstName')}</Label>
          <Input id="firstName" name="firstName" defaultValue={employee.first_name} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">{t('employees.lastName')}</Label>
          <Input id="lastName" name="lastName" defaultValue={employee.last_name} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t('employees.email')}</Label>
          <Input id="email" name="email" type="email" defaultValue={employee.email ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={employee.phone ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hireDate">{t('employees.hireDate')}</Label>
          <Input id="hireDate" name="hireDate" type="date" defaultValue={employee.hire_date} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jobTitle">Job title</Label>
          <Input id="jobTitle" name="jobTitle" defaultValue={employee.job_title ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="employeeType">{t('employees.type')}</Label>
          <select id="employeeType" name="employeeType" defaultValue={employee.employee_type} className={inputCls}>
            <option value="employee">Employee (W-2)</option>
            <option value="contractor">Contractor (1099)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="primaryJurisdictionCode">{t('employees.jurisdiction')}</Label>
          <select
            id="primaryJurisdictionCode"
            name="primaryJurisdictionCode"
            defaultValue={employee.primary_jurisdiction_code}
            className={inputCls}
            required
          >
            {jurisdictions.map((j) => (
              <option key={j.code} value={j.code}>
                {j.code} — {j.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="w4FilingStatus">W-4 Filing status</Label>
          <select id="w4FilingStatus" name="w4FilingStatus" defaultValue={employee.w4_filing_status} className={inputCls}>
            <option value="single">Single</option>
            <option value="married_jointly">Married jointly</option>
            <option value="married_separately">Married separately</option>
            <option value="head_of_household">Head of household</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="w4Dependents">W-4 Dependents</Label>
          <Input id="w4Dependents" name="w4Dependents" type="number" min={0} defaultValue={employee.w4_dependents} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="localityCode">{t('employees.locality')}</Label>
          <select id="localityCode" name="localityCode" defaultValue={employee.locality_code ?? ''} className={inputCls}>
            <option value="">{t('employees.localityNone')}</option>
            {LOCALITY_CODES.map((code) => (
              <option key={code} value={code}>
                {code} — {localityName(code)}
              </option>
            ))}
          </select>
        </div>
        {subcontractors.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="subcontractorId">{t('employees.subcontractor')}</Label>
            <select
              id="subcontractorId"
              name="subcontractorId"
              defaultValue={employee.subcontractor_id ?? ''}
              className={inputCls}
            >
              <option value="">{t('employees.subcontractorNone')}</option>
              {subcontractors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {subcontractors.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="billRateHourly">{t('employees.billRate')}</Label>
            <Input
              id="billRateHourly"
              name="billRateHourly"
              type="number"
              step="0.01"
              min={0}
              defaultValue={billRateCents != null ? billRateCents / 100 : ''}
            />
            <p className="text-xs text-muted-foreground">{t('employees.billRateHint')}</p>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="taxId">SSN / Tax ID</Label>
          <Input
            id="taxId"
            name="taxId"
            placeholder={employee.tax_id_last_four ? `•••-••-${employee.tax_id_last_four} (leave blank to keep)` : 'XXX-XX-XXXX'}
            autoComplete="off"
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? t('common.loading') : t('common.save')}
        </Button>
      </div>
    </form>
  )
}
