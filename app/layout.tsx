import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import {
  siteAuthor,
  siteDescription,
  siteLocale,
  siteName,
  siteTitle,
  siteTitleTemplate,
} from '@/lib/site-metadata'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: siteTitleTemplate,
  },
  description: siteDescription,
  applicationName: siteName,
  authors: [siteAuthor],
  creator: siteAuthor.name,
  metadataBase: new URL('https://carpeta.cl'),
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    siteName,
    url: '/',
    locale: siteLocale,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: siteTitle,
    description: siteDescription,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
    shortcut: '/favicon.ico',
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
