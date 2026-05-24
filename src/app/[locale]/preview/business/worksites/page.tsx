import { Plus, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LiveMap } from '@/components/admin/LiveMap'
import { MOCK_WORKSITES } from '@/lib/preview/mock-data'

export default async function PreviewWorksitesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Worksites</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add worksite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="Main job site" />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input placeholder="123 Main St, Brooklyn" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input type="number" step="0.000001" defaultValue="40.6892" />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input type="number" step="0.000001" defaultValue="-73.9442" />
              </div>
            </div>
            <Button type="button" variant="outline" size="sm">
              <MapPin className="mr-1 h-3 w-3" /> Use my current location
            </Button>
            <div className="space-y-2">
              <Label>Radius (meters)</Label>
              <Input type="number" defaultValue={100} />
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add worksite
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configured worksites</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <LiveMap points={[]} geofences={MOCK_WORKSITES} height={400} />
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Coordinates</th>
              <th className="px-4 py-3 font-medium">Radius</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_WORKSITES.map((w) => (
              <tr key={w.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{w.label}</td>
                <td className="px-4 py-3 text-xs font-mono">
                  {w.lat.toFixed(5)}, {w.lng.toFixed(5)}
                </td>
                <td className="px-4 py-3">{w.radius_m}m</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Active</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
