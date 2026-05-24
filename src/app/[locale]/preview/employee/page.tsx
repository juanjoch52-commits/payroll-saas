import { Camera, Clock as ClockIcon, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MOCK_EMPLOYEE_SESSION } from '@/lib/preview/mock-data'

export default async function PreviewEmployeeClockPage() {
  const { employee, open_entry } = MOCK_EMPLOYEE_SESSION
  const clockInDate = new Date(open_entry.clock_in_at)

  // Calcular tiempo trabajado (al momento, "2h 14m" estático para el mock)
  const elapsedH = 2
  const elapsedM = 14

  return (
    <div className="container max-w-md space-y-6 py-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold">Clock in / out</h1>
        <p className="text-sm text-muted-foreground">{employee.full_name}</p>
      </header>

      <Card>
        <CardContent className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <ClockIcon className="h-8 w-8 text-green-700" />
          </div>
          <p className="text-lg font-semibold text-green-700">You&apos;re clocked in</p>
          <p className="text-sm text-muted-foreground">
            Since {clockInDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </p>
          <p className="mt-2 text-sm font-medium">
            {elapsedH}h {elapsedM}m so far
          </p>
          <div className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>Brooklyn Job Site #1</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <div className="flex h-48 w-full items-center justify-center rounded border-2 border-dashed border-muted-foreground/30">
            <div className="text-center">
              <Camera className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-xs text-muted-foreground">Tap to take photo</p>
            </div>
          </div>
          <Button variant="outline" className="mt-3 w-full">
            <Camera className="mr-2 h-4 w-4" />
            Take photo
          </Button>
        </CardContent>
      </Card>

      <Button size="lg" className="h-16 w-full text-lg" variant="destructive">
        <ClockIcon className="mr-2 h-5 w-5" />
        Clock out
      </Button>
    </div>
  )
}
