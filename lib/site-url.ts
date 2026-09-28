/** Canonical production origin for absolute URLs (sitemap, robots). */
export const siteOrigin = 'https://carpeta.cl'

export function absoluteSiteUrl(pathname: string): string {
  if (pathname === '' || pathname === '/') {
    return siteOrigin
  }
  return `${siteOrigin}${pathname.startsWith('/') ? pathname : `/${pathname}`}`
}
