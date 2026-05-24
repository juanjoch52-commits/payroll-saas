'use client'

import { useEffect, useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Camera, Clock as ClockIcon, MapPin, AlertTriangle } from 'lucide-react'
import { clockIn, clockOut } from '@/app/actions/time-tracking'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Componente cliente para clock in/out.
 *
 * Flujo:
 *   1) Capturar foto: <input type="file" capture="environment"> (mejor que getUserMedia
 *      porque usa la app nativa de cámara del OS).
 *   2) Capturar ubicación: navigator.geolocation.getCurrentPosition.
 *   3) Submit a Server Action.
 *
 * El componente comprime la foto a 1024x1024 max via canvas antes de subir
 * para reducir tamaño (de ~5MB → ~200KB).
 */
type OpenEntry = {
  id: string
  clock_in_at: string
  clock_in_outside_geofence: boolean
} | null

type Status = 'idle' | 'capturing-location' | 'uploading' | 'success' | 'error'

export function ClockControls({
  locale,
  employeeName,
  openEntry,
}: {
  locale: string
  employeeName: string | null
  openEntry: OpenEntry
}) {
  const t = useTranslations()
  const router = useRouter()
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [_pending, startTransition] = useTransition()
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState<{ h: number; m: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Si hay turno abierto, actualizar contador cada minuto
  useEffect(() => {
    if (!openEntry) return
    const update = () => {
      const start = new Date(openEntry.clock_in_at).getTime()
      const minutes = Math.floor((Date.now() - start) / 60000)
      setElapsed({ h: Math.floor(minutes / 60), m: minutes % 60 })
    }
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [openEntry])

  /**
   * Comprime un archivo de imagen a max 1024x1024 con calidad 0.8.
   * Devuelve un nuevo File más liviano.
   */
  async function compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1024
        let { width, height } = img
        if (width > height && width > MAX) {
          height = (height * MAX) / width
          width = MAX
        } else if (height > MAX) {
          width = (width * MAX) / height
          height = MAX
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas no soportado'))
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Compresión falló'))
            resolve(new File([blob], file.name, { type: 'image/jpeg' }))
          },
          'image/jpeg',
          0.8,
        )
      }
      img.onerror = () => reject(new Error('No se pudo leer la imagen'))
      img.src = URL.createObjectURL(file)
    })
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setPhoto(f)
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(f)
  }

  async function getLocation(): Promise<{ lat: number; lng: number; acc: number }> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Tu dispositivo no soporta geolocalización.'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            acc: pos.coords.accuracy,
          }),
        (err) => reject(new Error(`No se pudo obtener tu ubicación: ${err.message}`)),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      )
    })
  }

  async function handleClockIn() {
    setError(null)
    if (!photo) {
      setError(t('clock.needsCamera'))
      return
    }

    setStatus('capturing-location')
    try {
      const loc = await getLocation()
      setStatus('uploading')

      const compressed = await compressImage(photo)
      const fd = new FormData()
      fd.set('latitude', String(loc.lat))
      fd.set('longitude', String(loc.lng))
      fd.set('accuracy', String(loc.acc))
      fd.set('photo', compressed)

      startTransition(async () => {
        const res = await clockIn(fd)
        if (res.success) {
          setStatus('success')
          setPhoto(null)
          setPhotoPreview(null)
          router.refresh()
        } else {
          setStatus('error')
          setError(res.error)
        }
      })
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Error inesperado.')
    }
  }

  async function handleClockOut() {
    setError(null)
    if (!photo) {
      setError(t('clock.needsCamera'))
      return
    }

    setStatus('capturing-location')
    try {
      const loc = await getLocation()
      setStatus('uploading')

      const compressed = await compressImage(photo)
      const fd = new FormData()
      fd.set('latitude', String(loc.lat))
      fd.set('longitude', String(loc.lng))
      fd.set('accuracy', String(loc.acc))
      fd.set('photo', compressed)

      startTransition(async () => {
        const res = await clockOut(fd)
        if (res.success) {
          setStatus('success')
          setPhoto(null)
          setPhotoPreview(null)
          router.refresh()
        } else {
          setStatus('error')
          setError(res.error)
        }
      })
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Error inesperado.')
    }
  }

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold">{t('clock.title')}</h1>
        {employeeName && <p className="text-sm text-muted-foreground">{employeeName}</p>}
      </header>

      {/* Estado actual */}
      <Card>
        <CardContent className="py-6 text-center">
          {openEntry ? (
            <>
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success/15 dark:bg-success/25">
                <ClockIcon className="h-8 w-8 text-success dark:text-success-foreground" />
              </div>
              <p className="text-lg font-semibold text-success dark:text-success-foreground">
                {t('clock.currentlyClockedIn')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('clock.since', { time: new Date(openEntry.clock_in_at).toLocaleTimeString() })}
              </p>
              {elapsed && (
                <p className="mt-2 text-sm font-medium">
                  {t('clock.openTurnDuration', { hours: elapsed.h, minutes: elapsed.m })}
                </p>
              )}
              {openEntry.clock_in_outside_geofence && (
                <div className="mt-3 flex items-center justify-center gap-1 text-xs text-warning dark:text-warning-foreground">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{t('clock.outsideGeofence')}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <ClockIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold">{t('clock.notClockedIn')}</p>
              <p className="text-sm text-muted-foreground">{t('clock.tapToClockIn')}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Captura de foto */}
      <Card>
        <CardContent className="py-4">
          <label className="flex flex-col items-center gap-2 text-sm">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Preview" className="h-48 w-full rounded object-cover" />
            ) : (
              <div className="flex h-48 w-full items-center justify-center rounded border-2 border-dashed border-muted-foreground/30">
                <div className="text-center">
                  <Camera className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-xs text-muted-foreground">Tap to take photo</p>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </label>
          <Button
            variant="outline"
            className="mt-3 w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="mr-2 h-4 w-4" />
            {photo ? 'Retake' : 'Take photo'}
          </Button>
        </CardContent>
      </Card>

      {/* Action button */}
      {openEntry ? (
        <Button
          size="lg"
          className="h-16 w-full text-lg"
          onClick={handleClockOut}
          disabled={status === 'capturing-location' || status === 'uploading'}
          variant="destructive"
        >
          {status === 'capturing-location' && (
            <>
              <MapPin className="mr-2 h-5 w-5 animate-pulse" />
              {t('clock.capturingLocation')}
            </>
          )}
          {status === 'uploading' && t('clock.uploadingPhoto')}
          {(status === 'idle' || status === 'error' || status === 'success') && (
            <>
              <ClockIcon className="mr-2 h-5 w-5" />
              {t('clock.clockOut')}
            </>
          )}
        </Button>
      ) : (
        <Button
          size="lg"
          className="h-16 w-full text-lg"
          onClick={handleClockIn}
          disabled={status === 'capturing-location' || status === 'uploading'}
        >
          {status === 'capturing-location' && (
            <>
              <MapPin className="mr-2 h-5 w-5 animate-pulse" />
              {t('clock.capturingLocation')}
            </>
          )}
          {status === 'uploading' && t('clock.uploadingPhoto')}
          {(status === 'idle' || status === 'error' || status === 'success') && (
            <>
              <ClockIcon className="mr-2 h-5 w-5" />
              {t('clock.clockIn')}
            </>
          )}
        </Button>
      )}

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  )
}
