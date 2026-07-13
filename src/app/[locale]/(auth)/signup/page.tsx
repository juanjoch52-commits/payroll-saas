import { getTranslations } from 'next-intl/server'
import { SignUpForm } from './signup-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function SignUpPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('auth.createYourCompany')}</CardTitle>
        <CardDescription>{t('auth.signUpHelp')}</CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm locale={locale} />
      </CardContent>
    </Card>
  )
}
