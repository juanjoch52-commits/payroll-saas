'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { signIn } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SsoButtons } from '@/components/auth/SsoButtons'

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    formData.set('locale', locale)
    startTransition(async () => {
      const res = await signIn(formData)
      // Si signIn tiene éxito, hace `redirect()` — esta línea no se ejecuta.
      if (res?.success === false) setError(res.error)
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t('auth.email')}</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t('auth.password')}</Label>
          <Link
            href={`/${locale}/forgot-password`}
            className="text-xs text-muted-foreground hover:text-primary"
          >
            {t('auth.forgotPassword')}
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t('common.loading') : t('auth.signIn')}
      </Button>

      <SsoButtons locale={locale} />

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.createAccount')}{' '}
        <Link
          href={`/${locale}/signup`}
          className="text-primary underline-offset-4 hover:underline"
        >
          {t('auth.signUp')}
        </Link>
      </p>
    </form>
  )
}
