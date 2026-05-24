import { getTranslations } from 'next-intl/server'
import { ResetPasswordForm } from './reset-password-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

/**
 * Página final del flujo de reset.
 *
 * El usuario llega aquí desde el email tras hacer click en el link de reset.
 * Supabase ya creó una sesión transitoria; aquí solo elige la nueva password.
 */
export default async function ResetPasswordPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()

  return (
    <div className="container max-w-md py-12">
      <Card>
        <CardHeader>
          <CardTitle>{t('auth.forgotPassword')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm locale={locale} />
        </CardContent>
      </Card>
    </div>
  )
}
