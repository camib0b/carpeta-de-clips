/** Shared carpeta.cl document metadata. A carpeta is the structure that holds the clips. */

export const siteName = 'carpeta.cl'
export const siteTitle = `${siteName} · Video análisis`
export const siteTitleTemplate = `%s · ${siteName}`
export const siteDescription =
  'Carpetas de clips de hockey césped, filtradas por concepto.'
export const siteLocale = 'es_CL' as const

export const siteAuthor = {
  name: 'Camila Escudero',
  url: 'https://camilaescudero.cl/',
}

export function teamOpenGraphTitle(teamName: string): string {
  return `${teamName} · ${siteName}`
}

export function teamPageDescription(teamName: string): string {
  return `Carpeta de ${teamName}. Clips filtrados por concepto.`
}
