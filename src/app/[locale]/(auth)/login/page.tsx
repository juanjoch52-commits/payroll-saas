import { getTranslations } from 'next-intl/server'
import { LoginForm } from './login-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function LoginPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('auth.signIn')}</CardTitle>
        <CardDescription>{t('auth.signInToContinue')}</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm locale={locale} />
      </CardContent>
    </Card>
  )
}
