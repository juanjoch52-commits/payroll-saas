'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

/**
 * Botones de inicio de sesión federado (SSO / OAuth).
 *
 * Usa `signInWithOAuth` del cliente browser de Supabase. El proveedor redirige
 * de vuelta a `/auth/callback`, que intercambia el code por sesión y manda al
 * dashboard. Los usuarios nuevos por SSO obtienen una org por defecto (ver
 * migración 20260501000013_oauth_default_org.sql).
 *
 * Requiere que Juan habilite los proveedores en el dashboard de Supabase
 * (Authentication → Providers). Sin eso, el proveedor devuelve un error que se
 * muestra inline.
 */
type Provider = 'google' | 'azure'

export function SsoButtons({ locale }: { locale: string }) {
  const t = useTranslations()
  const [pending, setPending] = useState<Provider | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleOAuth(provider: Provider) {
    setError(null)
    setPending(provider)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/${locale}/dashboard`,
        // azure (Microsoft) necesita el scope email explícito para devolver el correo.
        ...(provider === 'azure' ? { scopes: 'email' } : {}),
      },
    })
    if (error) {
      setError(error.message)
      setPending(null)
    }
    // En éxito el navegador ya se redirige al proveedor; no hay nada más que hacer.
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase text-muted-foreground">{t('auth.orContinueWith')}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={pending !== null}
          onClick={() => handleOAuth('google')}
        >
          {pending === 'google' ? t('common.loading') : t('auth.continueWithGoogle')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={pending !== null}
          onClick={() => handleOAuth('azure')}
        >
          {pending === 'azure' ? t('common.loading') : t('auth.continueWithMicrosoft')}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
