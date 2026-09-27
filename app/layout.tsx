import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const siteTitle = 'carpeta.cl | Video análisis'
const siteDescription = 'Video análisis de hockey césped, jugada por jugada.'

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  metadataBase: new URL('https://carpeta.cl'),
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    siteName: 'carpeta.cl',
    url: '/',
    locale: 'es_CL',
    type: 'website',
  },
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="bg-background">
      <body className="font-sans antialiased min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
