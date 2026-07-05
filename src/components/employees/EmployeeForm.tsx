'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createEmployee } from '@/app/actions/employees'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PAY_SCHEME_TYPES } from '@/lib/validators/employee'
import { LOCALITY_CODES, localityName } from '@/lib/payroll/us/local'

/**
 * Formulario único de empleado.
 *
 * Por simplicidad de MVP NO es multi-step — es un único form con secciones.
 * El usuario llena datos personales, fiscales, y el pay scheme.
 *
 * El componente convierte los inputs del pay scheme en un JSON serializado
 * que la Server Action parsea con Zod (paySchemeSchema).
 */
export function EmployeeForm({
  jurisdictions,
  subcontractors = [],
  locale,
}: {
  jurisdictions: { code: string; name: string; country: string }[]
  subcontractors?: { id: string; name: string }[]
  locale: string
}) {
  const t = useTranslations()
  const router = useRouter()
  const [scheme, setScheme] = useState<(typeof PAY_SCHEME_TYPES)[number]>('hourly')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Inputs específicos por scheme — todos en cents para evitar floats.
  const [rateDollars, setRateDollars] = useState<string>('25')
  const [overtimeMultiplier, setOvertimeMultiplier] = useState<string>('1.5')
  const [annualDollars, setAnnualDollars] = useState<string>('60000')
  const [periodsPerYear, setPeriodsPerYear] = useState<string>('26')
  const [dailyDollars, setDailyDollars] = useState<string>('200')
  const [commissionBase, setCommissionBase] = useState<string>('2000')
  const [commissionPct, setCommissionPct] = useState<string>('10')
  // Piece-rate (pago por producción / a destajo)
  const [pieceRateDollars, setPieceRateDollars] = useState<string>('0.50')
  const [pieceUnitLabel, setPieceUnitLabel] = useState<string>('unit')
  const [pieceMinFloor, setPieceMinFloor] = useState<string>('') // opcional, $/h

  function buildPaySchemeJson(): string {
    switch (scheme) {
      case 'hourly':
        return JSON.stringify({
          type: 'hourly',
          rateCents: Math.round(parseFloat(rateDollars) * 100),
          overtimeMultiplier: parseFloat(overtimeMultiplier),
          overtimeThresholdHours: 40,
        })
      case 'salary':
        return JSON.stringify({
          type: 'salary',
          annualCents: Math.round(parseFloat(annualDollars) * 100),
          periodsPerYear: parseInt(periodsPerYear),
        })
      case 'daily':
        return JSON.stringify({
          type: 'daily',
          dailyRateCents: Math.round(parseFloat(dailyDollars) * 100),
        })
      case 'commission':
        return JSON.stringify({
          type: 'commission',
          baseCents: Math.round(parseFloat(commissionBase) * 100),
          ratePct: parseFloat(commissionPct) / 100,
        })
      case 'piecerate':
        return JSON.stringify({
          type: 'piecerate',
          ratePerUnitCents: Math.round(parseFloat(pieceRateDollars) * 100),
          unitLabel: pieceUnitLabel.trim() || 'unit',
          ...(pieceMinFloor.trim()
            ? { minimumHourlyFloorCents: Math.round(parseFloat(pieceMinFloor) * 100) }
            : {}),
        })
    }
  }

  function handleSubmit(formData: FormData) {
    formData.set('paySchemeJson', buildPaySchemeJson())
    startTransition(async () => {
      const res = await createEmployee(formData)
      if (res.success) {
        router.push(`/${locale}/employees`)
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* === Sección: Datos personales === */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('employees.title')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">{t('employees.firstName')}</Label>
            <Input id="firstName" name="firstName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">{t('employees.lastName')}</Label>
            <Input id="lastName" name="lastName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('employees.email')}</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hireDate">{t('employees.hireDate')}</Label>
            <Input id="hireDate" name="hireDate" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job title</Label>
            <Input id="jobTitle" name="jobTitle" />
          </div>
        </div>
      </section>

      {/* === Sección: Tipo y jurisdicción === */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Employment
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="employeeType">{t('employees.type')}</Label>
            <select
              id="employeeType"
              name="employeeType"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue="employee"
            >
              <option value="employee">Employee (W-2)</option>
              <option value="contractor">Contractor (1099)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryJurisdictionCode">{t('employees.jurisdiction')}</Label>
            <select
              id="primaryJurisdictionCode"
              name="primaryJurisdictionCode"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue="US"
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
            <Label htmlFor="taxId">SSN / Tax ID</Label>
            <Input id="taxId" name="taxId" placeholder="XXX-XX-XXXX" autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="w4FilingStatus">W-4 Filing status</Label>
            <select
              id="w4FilingStatus"
              name="w4FilingStatus"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue="single"
            >
              <option value="single">Single</option>
              <option value="married_jointly">Married jointly</option>
              <option value="married_separately">Married separately</option>
              <option value="head_of_household">Head of household</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="w4Dependents">W-4 Dependents</Label>
            <Input id="w4Dependents" name="w4Dependents" type="number" min={0} defaultValue={0} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="localityCode">{t('employees.locality')}</Label>
            <select
              id="localityCode"
              name="localityCode"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue=""
            >
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
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="">{t('employees.subcontractorNone')}</option>
                {subcontractors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">{t('employees.subcontractorHint')}</p>
            </div>
          )}
        </div>
      </section>

      {/* === Sección: Pay scheme === */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('employees.payScheme')}
        </h3>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {PAY_SCHEME_TYPES.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setScheme(s)}
              className={
                'rounded-md border px-3 py-2 text-sm font-medium ' +
                (s === scheme
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input bg-background hover:bg-accent')
              }
            >
              {t(`employees.schemes.${s}` as 'employees.schemes.hourly')}
            </button>
          ))}
        </div>

        {scheme === 'hourly' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Hourly rate ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={rateDollars}
                onChange={(e) => setRateDollars(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Overtime multiplier</Label>
              <Input
                type="number"
                step="0.1"
                value={overtimeMultiplier}
                onChange={(e) => setOvertimeMultiplier(e.target.value)}
              />
            </div>
          </div>
        )}

        {scheme === 'salary' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Annual salary ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={annualDollars}
                onChange={(e) => setAnnualDollars(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Pay periods / year</Label>
              <select
                value={periodsPerYear}
                onChange={(e) => setPeriodsPerYear(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="52">Weekly (52)</option>
                <option value="26">Bi-weekly (26)</option>
                <option value="24">Semi-monthly (24)</option>
                <option value="12">Monthly (12)</option>
              </select>
            </div>
          </div>
        )}

        {scheme === 'daily' && (
          <div className="space-y-2">
            <Label>Daily rate ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={dailyDollars}
              onChange={(e) => setDailyDollars(e.target.value)}
              required
            />
          </div>
        )}

        {scheme === 'commission' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Base ($) per period</Label>
              <Input
                type="number"
                step="0.01"
                value={commissionBase}
                onChange={(e) => setCommissionBase(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Commission rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
                required
              />
            </div>
          </div>
        )}

        {scheme === 'piecerate' && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t('employees.piecerate.ratePerUnit')}</Label>
              <Input
                type="number"
                step="0.01"
                value={pieceRateDollars}
                onChange={(e) => setPieceRateDollars(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('employees.piecerate.unitLabel')}</Label>
              <Input
                value={pieceUnitLabel}
                onChange={(e) => setPieceUnitLabel(e.target.value)}
                placeholder="box, shirt, unit"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('employees.piecerate.minFloor')}</Label>
              <Input
                type="number"
                step="0.01"
                value={pieceMinFloor}
                onChange={(e) => setPieceMinFloor(e.target.value)}
                placeholder="7.25"
              />
            </div>
          </div>
        )}
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? t('common.loading') : t('common.create')}
        </Button>
      </div>
    </form>
  )
}
