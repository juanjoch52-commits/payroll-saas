'use client'

import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'

/**
 * Wrapper de providers cliente para toda la app.
 * - next-themes: dark/light/system con persistencia en localStorage + cookie.
 * - Toaster: notificaciones globales (sonner) — usa tokens del tema actual.
 *
 * La landing fuerza `forcedTheme="light"` desde su propio segment (ver `src/app/[locale]/page.tsx`).
 * El resto de layouts (app/admin/employee/preview) heredan el tema del usuario.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster richColors closeButton position="top-right" />
    </ThemeProvider>
  )
}
