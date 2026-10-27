import type { Metadata } from 'next'
import { Roboto, Roboto_Mono } from 'next/font/google'
import { PatternedBackground } from '@camib0b/ui/patterned-background'
import { Toaster } from '@/components/ui/sonner'
import {
  siteAuthor,
  siteDescription,
  siteLocale,
  siteName,
  siteTitle,
  siteTitleTemplate,
} from '@/lib/site-metadata'
import { siteOrigin } from '@/lib/site-url'
import './globals.css'

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-roboto',
  display: 'swap',
})

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-roboto-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: siteTitleTemplate,
  },
  description: siteDescription,
  applicationName: siteName,
  authors: [siteAuthor],
  creator: siteAuthor.name,
  metadataBase: new URL(siteOrigin),
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
    <html
      lang="es"
      className={`${roboto.variable} ${robotoMono.variable} bg-background`}
    >
      <body className="font-sans antialiased min-h-screen">
        <PatternedBackground />
        <div className="relative z-10">
          {children}
          <Toaster />
        </div>
      </body>
    </html>
  )
}
