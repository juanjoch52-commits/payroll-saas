import { Card, CardContent } from '@/components/ui/card'

export type GuideStep = { title: string; desc: string }

/**
 * Lista numerada de pasos de la guía de inducción (server-safe, sin estado).
 * El contenido llega ya traducido desde la página que la usa.
 */
export function GuideSteps({ steps }: { steps: GuideStep[] }) {
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => (
        <li key={i}>
          <Card>
            <CardContent className="flex gap-3 py-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ol>
  )
}

/** Lee `count` pasos `prefix.s1..sN` (con .t título y .d cuerpo) de i18n. */
export function stepsFromT(
  t: (key: string) => string,
  prefix: string,
  count: number,
): GuideStep[] {
  return Array.from({ length: count }, (_, i) => ({
    title: t(`${prefix}.s${i + 1}.t`),
    desc: t(`${prefix}.s${i + 1}.d`),
  }))
}
