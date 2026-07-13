'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { forgotPassword } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ForgotPasswordForm({ locale }: { locale: string }) {
  const t = useTranslations()
  const [sent, setSent] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    formData.set('locale', locale)
    startTransition(async () => {
      await forgotPassword(formData)
      setSent(true)
    })
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">{t('auth.checkYourEmail')}</p>
    )
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t('auth.email')}</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t('common.loading') : t('common.next')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href={`/${locale}/login`} className="text-primary underline-offset-4 hover:underline">
          {t('common.back')}
        </Link>
      </p>
    </form>
  )
}
