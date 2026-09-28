import type { Metadata } from 'next'
import Link from 'next/link'
import { siteName } from '@/lib/site-metadata'

const notFoundTitle = `Equipo no encontrado · ${siteName}`

export const metadata: Metadata = {
  title: 'Equipo no encontrado',
  openGraph: {
    title: notFoundTitle,
  },
  twitter: {
    card: 'summary',
    title: notFoundTitle,
  },
}

export default function TeamNotFound() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-6 py-24">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">
          Equipo no encontrado
        </h1>
        <Link
          href="/"
          className="mt-8 inline-block text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Todos los Equipos
        </Link>
      </main>
    </div>
  )
}
