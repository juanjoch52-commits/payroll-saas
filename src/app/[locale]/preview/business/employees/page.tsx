import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MOCK_EMPLOYEES } from '@/lib/preview/mock-data'
import { formatDate } from '@/lib/utils'

const SCHEME_LABEL: Record<string, string> = {
  hourly: 'Hourly',
  salary: 'Salary',
  daily: 'Daily',
  commission: 'Commission',
}

export default async function PreviewEmployeesPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">{MOCK_EMPLOYEES.length} employees</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add employee
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Hire date</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Pay scheme</th>
              <th className="px-4 py-3 font-medium">Jurisdiction</th>
              <th className="px-4 py-3 font-medium">Portal</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_EMPLOYEES.map((e) => (
              <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/${locale}/preview/business/employees/${e.id}`} className="hover:text-primary hover:underline">
                    {e.first_name} {e.last_name}
                  </Link>
                  {e.job_title && <p className="text-xs text-muted-foreground">{e.job_title}</p>}
                </td>
                <td className="px-4 py-3">{formatDate(e.hire_date, locale)}</td>
                <td className="px-4 py-3 capitalize">{e.employee_type}</td>
                <td className="px-4 py-3">{SCHEME_LABEL[e.scheme_type]}</td>
                <td className="px-4 py-3">{e.primary_jurisdiction_code}</td>
                <td className="px-4 py-3">
                  {e.has_portal ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Active</span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">Not invited</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    {e.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
