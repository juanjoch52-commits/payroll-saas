'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { MapPin } from 'lucide-react'
import { createWorksite } from '@/app/actions/worksites'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function WorksiteForm({ locale: _locale }: { locale: string }) {
  const t = useTranslations()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  function useCurrentLocation() {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError('No se pudo obtener tu ubicación.'),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const res = await createWorksite(formData)
      if (res.success) {
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t('worksites.name')}</Label>
        <Input id="name" name="name" required placeholder="Main job site" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">{t('worksites.address')}</Label>
        <Input id="address" name="address" placeholder="123 Main St, City" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            name="latitude"
            type="number"
            step="0.000001"
            required
            value={coords?.lat ?? ''}
            onChange={(e) => setCoords({ lat: parseFloat(e.target.value), lng: coords?.lng ?? 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            name="longitude"
            type="number"
            step="0.000001"
            required
            value={coords?.lng ?? ''}
            onChange={(e) => setCoords({ lat: coords?.lat ?? 0, lng: parseFloat(e.target.value) })}
          />
        </div>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={useCurrentLocation}>
        <MapPin className="mr-1 h-3 w-3" />
        Use my current location
      </Button>

      <div className="space-y-2">
        <Label htmlFor="radius_m">{t('worksites.radius')}</Label>
        <Input id="radius_m" name="radius_m" type="number" defaultValue={100} min={10} required />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? t('common.loading') : t('common.create')}
      </Button>
    </form>
  )
}
