/**
 * Layout del kiosko — pantalla completa de terminal, SIN navegación de la app
 * y SIN requireSession(). La seguridad del kiosko vive en el device_token +
 * Server Actions con service role, no en la sesión (ver src/lib/kiosk/auth.ts).
 */
export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-slate-950 text-slate-50">
      {children}
    </div>
  )
}
