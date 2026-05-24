import { FileText, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const MOCK_FORMS = [
  { id: 'f1', form_type: 'W-2', tax_year: 2025, employee: 'Maria García', generated_at: '2026-01-31' },
  { id: 'f2', form_type: 'W-2', tax_year: 2025, employee: 'Carlos Rivera', generated_at: '2026-01-31' },
  { id: 'f3', form_type: 'W-2', tax_year: 2025, employee: 'Linda Nguyen', generated_at: '2026-01-31' },
  { id: 'f4', form_type: 'W-2', tax_year: 2025, employee: 'Diego Hernández', generated_at: '2026-01-31' },
  { id: 'f5', form_type: '1099-NEC', tax_year: 2025, employee: 'James Thompson', generated_at: '2026-01-31' },
]

export default async function PreviewReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Tax reports</h1>

      <Card>
        <CardHeader>
          <CardTitle>Year-end forms</CardTitle>
          <CardDescription>Generate W-2 and 1099-NEC PDFs for all employees at once.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <select className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option>2025</option>
              <option>2024</option>
              <option>2023</option>
            </select>
            <Button>
              <FileText className="mr-2 h-4 w-4" />
              Generate W-2s
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generated forms</CardTitle>
          <CardDescription>{MOCK_FORMS.length} forms generated for tax year 2025</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 font-medium">Form</th>
                <th className="py-2 font-medium">Year</th>
                <th className="py-2 font-medium">Employee</th>
                <th className="py-2 font-medium">Generated</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {MOCK_FORMS.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="py-2 font-medium">{f.form_type}</td>
                  <td className="py-2">{f.tax_year}</td>
                  <td className="py-2">{f.employee}</td>
                  <td className="py-2 text-muted-foreground">{f.generated_at}</td>
                  <td className="py-2 text-right">
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
