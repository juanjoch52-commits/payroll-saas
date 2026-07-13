import { redirect } from 'next/navigation'
import { acceptInvitation } from '@/app/actions/invitations'
import { getActiveSession } from '@/lib/auth/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

/**
 * Endpoint visual para usuarios que ya están logged-in y vienen de un email
 * de invitación. Acepta la invitación automáticamente y los manda al dashboard
 * (o al portal de empleado si su rol es employee).
 */
export default async function AcceptInvitePage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { token?: string }
}) {
  const token = searchParams.token
  if (!token) redirect(`/${locale}`)

  const session = await getActiveSession()
  if (!session) {
    redirect(`/${locale}/signup?invite=${token}`)
  }

  const result = await acceptInvitation(token)

  if (!result.success) {
    return (
      <div className="container max-w-md py-12">
        <Card>
          <CardHeader>
            <CardTitle>Invitation problem</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success → enviar al dashboard apropiado. El layout decidirá si es portal employee o admin.
  redirect(`/${locale}/dashboard`)
}
