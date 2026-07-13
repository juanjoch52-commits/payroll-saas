import { getTranslations } from 'next-intl/server'
import { ForgotPasswordForm } from './forgot-password-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ForgotPasswordPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('auth.forgotPassword')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm locale={locale} />
      </CardContent>
    </Card>
  )
}
