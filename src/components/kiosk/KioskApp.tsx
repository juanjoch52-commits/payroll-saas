'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Clock, Delete, Camera, CheckCircle2, XCircle, MapPin, Settings } from 'lucide-react'
import { redeemPairingCode, kioskRoster, kioskCheckIn } from '@/app/actions/kiosk'

const TOKEN_KEY = 'myjova_kiosk_token'

type RosterEmployee = { id: string; name: string; hasPin: boolean }
type View = 'loading' | 'pairing' | 'roster' | 'pin' | 'capture' | 'result'
type ResultState =
  | { ok: true; action: 'in' | 'out'; name: string; outsideGeofence: boolean }
  | { ok: false; error: string }

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function KioskApp() {
  const t = useTranslations()
  const [view, setView] = useState<View>('loading')
  const [token, setToken] = useState<string | null>(null)
  const [worksiteName, setWorksiteName] = useState('')
  const [employees, setEmployees] = useState<RosterEmployee[]>([])
  const [selected, setSelected] = useState<RosterEmployee | null>(null)
  const [pin, setPin] = useState('')
  const [pairCode, setPairCode] = useState('')
  const [pairError, setPairError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ResultState | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const loadRoster = useCallback(async (tok: string) => {
    const res = await kioskRoster(tok)
    if (!res.success) {
      // Token inválido/revocado → volver a emparejar.
      localStorage.removeItem(TOKEN_KEY)
      setToken(null)
      setView('pairing')
      return
    }
    setWorksiteName(res.worksiteName)
    setEmployees(res.employees)
    setView('roster')
  }, [])

  // Carga inicial: lee token de localStorage.
  useEffect(() => {
    const tok = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
    if (tok) {
      setToken(tok)
      loadRoster(tok)
    } else {
      setView('pairing')
    }
  }, [loadRoster])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop())
    streamRef.current = null
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch {
      // Cámara no disponible: se permite fichar sin foto.
    }
  }

  function grabPhoto(): string | undefined {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return undefined
    const size = 480
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined
    const vw = video.videoWidth
    const vh = video.videoHeight
    const side = Math.min(vw, vh)
    ctx.drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, size, size)
    return canvas.toDataURL('image/jpeg', 0.7).split(',')[1]
  }

  function getGeo(): Promise<{ lat?: number; lng?: number }> {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve({})
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 5000 },
      )
    })
  }

  async function handlePair() {
    setPairError(null)
    setBusy(true)
    const res = await redeemPairingCode(pairCode.trim().toUpperCase())
    setBusy(false)
    if (!res.success) {
      setPairError(res.error)
      return
    }
    localStorage.setItem(TOKEN_KEY, res.token)
    setToken(res.token)
    setPairCode('')
    setView('loading')
    loadRoster(res.token)
  }

  function pickEmployee(emp: RosterEmployee) {
    if (!emp.hasPin) return
    setSelected(emp)
    setPin('')
    setView('pin')
  }

  function pressDigit(d: string) {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    if (next.length === 4) {
      // Pasa a la captura de selfie.
      setView('capture')
      void startCamera()
    }
  }

  async function confirmCheckIn() {
    if (!selected || !token) return
    setBusy(true)
    const photoBase64 = grabPhoto()
    const geo = await getGeo()
    const res = await kioskCheckIn({
      token,
      employeeId: selected.id,
      pin,
      photoBase64,
      lat: geo.lat,
      lng: geo.lng,
    })
    stopCamera()
    setBusy(false)
    setPin('')
    setResult(
      res.success
        ? { ok: true, action: res.action, name: res.employeeName, outsideGeofence: res.outsideGeofence }
        : { ok: false, error: res.error },
    )
    setView('result')
    window.setTimeout(() => {
      setSelected(null)
      setResult(null)
      setView('roster')
    }, 4500)
  }

  function cancelToRoster() {
    stopCamera()
    setSelected(null)
    setPin('')
    setView('roster')
  }

  function unpair() {
    if (!confirm(t('kiosk.unpairConfirm'))) return
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setEmployees([])
    setView('pairing')
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  if (view === 'loading') {
    return <Centered>{t('common.loading')}</Centered>
  }

  if (view === 'pairing') {
    return (
      <Centered>
        <div className="w-full max-w-sm space-y-6 text-center">
          <Clock className="mx-auto h-12 w-12 text-sky-400" />
          <div>
            <h1 className="text-2xl font-bold">{t('kiosk.pairTitle')}</h1>
            <p className="mt-1 text-slate-400">{t('kiosk.pairPrompt')}</p>
          </div>
          <input
            value={pairCode}
            onChange={(e) => setPairCode(e.target.value.toUpperCase())}
            placeholder="ABCD2345"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-4 text-center text-2xl font-mono tracking-widest uppercase outline-none focus:border-sky-500"
            maxLength={12}
          />
          {pairError && <p className="text-sm text-red-400">{pairError}</p>}
          <button
            onClick={handlePair}
            disabled={busy || pairCode.trim().length < 6}
            className="w-full rounded-xl bg-sky-600 py-4 text-lg font-semibold hover:bg-sky-500 disabled:opacity-40"
          >
            {busy ? t('common.loading') : t('kiosk.pair')}
          </button>
          <p className="text-xs text-slate-500">{t('kiosk.pairHint')}</p>
        </div>
      </Centered>
    )
  }

  if (view === 'roster') {
    return (
      <div className="flex h-full flex-col">
        <Header title={t('kiosk.title')} subtitle={worksiteName} onUnpair={unpair} />
        <div className="flex-1 overflow-y-auto p-6">
          {employees.length === 0 ? (
            <Centered>{t('kiosk.noEmployees')}</Centered>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => pickEmployee(emp)}
                  disabled={!emp.hasPin}
                  className={
                    'flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 transition ' +
                    (emp.hasPin ? 'hover:border-sky-500 hover:bg-slate-800' : 'opacity-40')
                  }
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-600 text-xl font-bold">
                    {initials(emp.name)}
                  </span>
                  <span className="text-center text-sm font-medium leading-tight">{emp.name}</span>
                  {!emp.hasPin && <span className="text-[10px] text-slate-500">{t('kiosk.noPin')}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (view === 'pin') {
    return (
      <div className="flex h-full flex-col">
        <Header title={selected?.name ?? ''} subtitle={t('kiosk.enterPin')} onBack={cancelToRoster} />
        <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
          <div className="flex gap-4">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={
                  'h-5 w-5 rounded-full border-2 ' +
                  (i < pin.length ? 'border-sky-400 bg-sky-400' : 'border-slate-600')
                }
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <PadButton key={d} onClick={() => pressDigit(d)}>
                {d}
              </PadButton>
            ))}
            <div />
            <PadButton onClick={() => pressDigit('0')}>0</PadButton>
            <PadButton onClick={() => setPin(pin.slice(0, -1))}>
              <Delete className="h-7 w-7" />
            </PadButton>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'capture') {
    return (
      <div className="flex h-full flex-col">
        <Header title={selected?.name ?? ''} subtitle={t('kiosk.takePhoto')} onBack={cancelToRoster} />
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
          <div className="relative h-64 w-64 overflow-hidden rounded-full border-4 border-slate-700 bg-slate-900">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            <Camera className="absolute inset-0 m-auto h-10 w-10 text-slate-700" />
          </div>
          <p className="text-slate-400">{t('kiosk.cameraHint')}</p>
          <button
            onClick={confirmCheckIn}
            disabled={busy}
            className="flex items-center gap-3 rounded-xl bg-sky-600 px-10 py-5 text-xl font-semibold hover:bg-sky-500 disabled:opacity-40"
          >
            <Camera className="h-6 w-6" />
            {busy ? t('common.loading') : t('kiosk.confirm')}
          </button>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    )
  }

  // result
  return (
    <Centered>
      {result?.ok ? (
        <div className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-20 w-20 text-emerald-400" />
          <h1 className="text-3xl font-bold">
            {result.action === 'in' ? t('kiosk.clockedIn') : t('kiosk.clockedOut')}
          </h1>
          <p className="text-xl text-slate-300">{result.name}</p>
          {result.outsideGeofence && (
            <p className="flex items-center justify-center gap-2 text-amber-400">
              <MapPin className="h-5 w-5" />
              {t('kiosk.outsideGeofence')}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <XCircle className="mx-auto h-20 w-20 text-red-400" />
          <h1 className="text-2xl font-bold">{result?.error}</h1>
          <button
            onClick={cancelToRoster}
            className="rounded-xl bg-slate-800 px-8 py-3 font-semibold hover:bg-slate-700"
          >
            {t('kiosk.tryAgain')}
          </button>
        </div>
      )}
    </Centered>
  )
}

// --------------------------------------------------------------------------
// Subcomponentes
// --------------------------------------------------------------------------
function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center p-8">{children}</div>
}

function Header({
  title,
  subtitle,
  onBack,
  onUnpair,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  onUnpair?: () => void
}) {
  return (
    <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700">
            ←
          </button>
        )}
        <div>
          <h1 className="text-lg font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {onUnpair && (
        <button onClick={onUnpair} className="text-slate-600 hover:text-slate-400" aria-label="unpair">
          <Settings className="h-5 w-5" />
        </button>
      )}
    </header>
  )
}

function PadButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 text-3xl font-semibold transition hover:bg-slate-700 active:scale-95"
    >
      {children}
    </button>
  )
}
