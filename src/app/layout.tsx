import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Providers } from '@/components/providers'
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'MyJova — Payroll & time tracking for contractors and restaurants',
    template: '%s | MyJova',
  },
  description:
    'Multi-tenant payroll SaaS with clock in/out using photo + GPS, automatic tax calculation, and W-2/1099 year-end forms. For small contractors and restaurants in the US and Canada.',
  applicationName: 'MyJova',
  keywords: [
    'payroll',
    'time tracking',
    'clock in clock out',
    'contractors',
    'restaurants',
    'W-2',
    '1099-NEC',
    'small business payroll',
    'mobile time tracking',
    'geofencing',
  ],
  authors: [{ name: 'MyJova' }],
  creator: 'MyJova',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/isotipo.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/isotipo.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'MyJova',
    title: 'MyJova — Payroll & time tracking, simplified',
    description:
      'Clock in with photo + GPS. Run payroll. Generate W-2/1099. All from one mobile app.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'MyJova' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MyJova — Payroll & time tracking',
    description: 'Clock in with photo + GPS. Run payroll. Generate W-2/1099.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

/**
 * Layout RAÍZ — no incluye i18n (eso lo hace [locale]/layout.tsx).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <ImpersonationBanner />
          {children}
        </Providers>
      </body>
    </html>
  )
}
