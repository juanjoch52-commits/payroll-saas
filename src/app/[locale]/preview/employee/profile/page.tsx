import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MOCK_EMPLOYEE_SESSION } from '@/lib/preview/mock-data'

export default async function PreviewEmployeeProfilePage() {
  const { employee } = MOCK_EMPLOYEE_SESSION

  return (
    <div className="container max-w-md py-6">
      <h1 className="mb-4 text-2xl font-bold">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>{employee.full_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{employee.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Job title</span>
            <span>{employee.job_title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Hire date</span>
            <span>{employee.hire_date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">SSN</span>
            <span>•••-••-{employee.tax_id_last_four}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Organization</span>
            <span>{employee.org_name}</span>
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        To update your information, contact your manager.
      </p>
    </div>
  )
}
