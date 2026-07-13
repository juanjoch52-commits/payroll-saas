'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Tablet, Trash2, KeyRound, Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  createKioskPairingCode,
  deactivateKioskDevice,
  deleteKioskDevice,
  setEmployeePin,
  clearEmployeePin,
} from '@/app/actions/kiosk-admin'

type Worksite = { id: string; name: string }
type WorksiteRef = { name: string } | { name: string }[]
type Device = {
  id: string
  name: string
  is_active: boolean
  last_seen_at: string | null
  worksites: WorksiteRef
}
type EmployeeRow = { id: string; name: string; hasPin: boolean }

function wsName(w: WorksiteRef): string {
  const x = Array.isArray(w) ? w[0] : w
  return x?.name ?? ''
}

export function DeviceManager({
  locale,
  role,
  worksites,
  devices,
  employees,
}: {
  locale: string
  role: string
  worksites: Worksite[]
  devices: Device[]
  employees: EmployeeRow[]
}) {
  const t = useTranslations()
  const [pending, startTransition] = useTransition()
  const isOwnerAdmin = role === 'owner' || role === 'admin'

  // --- Pairing ---
  const [worksiteId, setWorksiteId] = useState(worksites[0]?.id ?? '')
  const [deviceName, setDeviceName] = useState('')
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function generate() {
    setError(null)
    setGeneratedCode(null)
    startTransition(async () => {
      const res = await createKioskPairingCode({ worksiteId, name: deviceName.trim() || 'Kiosk' })
      if (res.success) {
        setGeneratedCode(res.code)
        setDeviceName('')
      } else {
        setError(res.error)
      }
    })
  }

  function act(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (!res.success) setError(res.error ?? 'Error')
    })
  }

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* === Emparejar tablet === */}
      {isOwnerAdmin && (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="mb-1 flex items-center gap-2 font-semibold">
            <Tablet className="h-5 w-5" />
            {t('devices.pairTablet')}
          </h2>
          {worksites.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('devices.noWorksites')}</p>
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('devices.worksite')}</Label>
                <select
                  value={worksiteId}
                  onChange={(e) => setWorksiteId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {worksites.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t('devices.deviceName')}</Label>
                <Input
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="Front counter iPad"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={generate} disabled={pending || !worksiteId} className="w-full">
                  {t('devices.generateCode')}
                </Button>
              </div>
            </div>
          )}

          {generatedCode && (
            <div className="mt-4 rounded-lg border border-info/40 bg-info/5 p-4">
              <p className="text-sm text-muted-foreground">{t('devices.codeReady')}</p>
              <p className="my-2 font-mono text-3xl font-bold tracking-widest">{generatedCode}</p>
              <p className="text-xs text-muted-foreground">{t('devices.codeExpires')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigator.clipboard?.writeText(generatedCode)}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  {t('common.copy')}
                </Button>
                <Link href={`/${locale}/kiosk`} target="_blank">
                  <Button size="sm" variant="outline" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    {t('devices.openKiosk')}
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {/* === Dispositivos === */}
      <section className="rounded-lg border bg-card p-6">
        <h2 className="mb-3 font-semibold">{t('devices.devicesList')}</h2>
        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('devices.noDevices')}</p>
        ) : (
          <ul className="space-y-2">
            {devices.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{d.name}</p>
                  <p className="text-muted-foreground">
                    {wsName(d.worksites)} ·{' '}
                    {d.last_seen_at
                      ? `${t('devices.lastSeen')} ${new Date(d.last_seen_at).toLocaleDateString(locale)}`
                      : t('devices.never')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={d.is_active ? 'success' : 'muted'}>
                    {d.is_active ? t('devices.active') : t('devices.inactive')}
                  </Badge>
                  {isOwnerAdmin && d.is_active && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => act(() => deactivateKioskDevice(d.id))}
                      disabled={pending}
                    >
                      {t('devices.deactivate')}
                    </Button>
                  )}
                  {isOwnerAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(t('devices.confirmDelete'))) act(() => deleteKioskDevice(d.id))
                      }}
                      disabled={pending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* === PINs de empleados === */}
      <section className="rounded-lg border bg-card p-6">
        <h2 className="mb-1 flex items-center gap-2 font-semibold">
          <KeyRound className="h-5 w-5" />
          {t('devices.employeePins')}
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">{t('devices.pinsHint')}</p>
        <ul className="space-y-2">
          {employees.map((e) => (
            <EmployeePinRow key={e.id} employee={e} pending={pending} runAction={act} t={t} />
          ))}
          {employees.length === 0 && (
            <li className="text-sm text-muted-foreground">{t('devices.noEmployees')}</li>
          )}
        </ul>
      </section>
    </div>
  )
}

function EmployeePinRow({
  employee,
  pending,
  runAction,
  t,
}: {
  employee: EmployeeRow
  pending: boolean
  runAction: (fn: () => Promise<{ success: boolean; error?: string }>) => void
  t: ReturnType<typeof useTranslations>
}) {
  const [editing, setEditing] = useState(false)
  const [pin, setPin] = useState('')

  function save() {
    runAction(async () => {
      const res = await setEmployeePin({ employeeId: employee.id, pin })
      if (res.success) {
        setEditing(false)
        setPin('')
      }
      return res
    })
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
      <span className="font-medium">{employee.name}</span>
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              placeholder="••••"
              className="h-9 w-20 text-center tracking-widest"
            />
            <Button size="sm" onClick={save} disabled={pending || pin.length !== 4}>
              {t('common.save')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {t('common.cancel')}
            </Button>
          </>
        ) : (
          <>
            <Badge variant={employee.hasPin ? 'success' : 'muted'}>
              {employee.hasPin ? t('devices.hasPin') : t('devices.noPin')}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={pending}>
              {employee.hasPin ? t('devices.changePin') : t('devices.setPin')}
            </Button>
            {employee.hasPin && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => runAction(() => clearEmployeePin(employee.id))}
                disabled={pending}
              >
                {t('devices.clearPin')}
              </Button>
            )}
          </>
        )}
      </div>
    </li>
  )
}
