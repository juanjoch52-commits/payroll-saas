'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { signUp, type SignUpResult } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Formulario de signup.
 *
 * Después de crear el user, Supabase manda email de confirmación. El user
 * debe hacer click en el link → /auth/callback → /[locale]/dashboard.
 */
export function SignUpForm({ locale }: { locale: string }) {
  const t = useTranslations()
  const [result, setResult] = useState<SignUpResult | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    formData.set('locale', locale)
    startTransition(async () => {
      const res = await signUp(formData)
      setResult(res)
    })
  }

  // Estado "email enviado" después de signup exitoso.
  if (result?.success) {
    return (
      <div className="space-y-4 text-center">
        <h3 className="text-lg font-semibold">{t('auth.checkYourEmail')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('auth.weSentConfirmation', { email: result.email })}
        </p>
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="organizationName">{t('auth.organizationName')}</Label>
        <Input
          id="organizationName"
          name="organizationName"
          type="text"
          required
          autoComplete="organization"
          placeholder="Acme Construction"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t('auth.email')}</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t('auth.password')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      {result && !result.success && (
        <p className="text-sm text-destructive">{result.error}</p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t('common.loading') : t('auth.signUp')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.alreadyHaveAccount')}{' '}
        <Link href={`/${locale}/login`} className="text-primary underline-offset-4 hover:underline">
          {t('auth.signIn')}
        </Link>
      </p>
    </form>
  )
}
