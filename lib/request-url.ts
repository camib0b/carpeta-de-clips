/**
 * Read the query of an absolute request URL without `new URL()`.
 * `Request` only exposes `url` as a string. Callers that need the parsed
 * host, path normalization, or protocol must still use `URL`.
 */
export function searchParamsFromAbsoluteUrl(url: string): URLSearchParams {
  const queryStart = url.indexOf('?')
  if (queryStart === -1) {
    return new URLSearchParams()
  }

  const hashStart = url.indexOf('#', queryStart + 1)
  const queryEnd = hashStart === -1 ? url.length : hashStart
  return new URLSearchParams(url.slice(queryStart + 1, queryEnd))
}

/**
 * Replace or delete one search param using the pathname, search, and hash
 * the browser already exposes on `location`.
 * `value` null deletes the param. Other params, path, and hash stay.
 */
export function hrefWithSearchParam(
  location: { pathname: string; search: string; hash: string },
  name: string,
  value: string | null,
): string {
  const params = new URLSearchParams(location.search)
  if (value == null) {
    params.delete(name)
  } else {
    params.set(name, value)
  }

  const query = params.toString()
  const search = query.length === 0 ? '' : `?${query}`
  return `${location.pathname}${search}${location.hash}`
}

/**
 * Path of an absolute URL string, without `new URL()`.
 * `Request.url` is already serialized, so this matches `URL.pathname` for
 * that form. A missing path (`https://host`) yields `/`.
 * It does not normalize dot segments, backslashes, or raw non-ASCII.
 * Those strings still need `URL` when the caller wants a parsed path.
 */
export function pathnameFromAbsoluteUrl(url: string): string {
  const schemeSeparator = url.indexOf('://')
  if (schemeSeparator === -1) {
    return '/'
  }

  const pathStart = url.indexOf('/', schemeSeparator + 3)
  if (pathStart === -1) {
    return '/'
  }

  const queryStart = url.indexOf('?', pathStart)
  const hashStart = url.indexOf('#', pathStart)
  let pathEnd = url.length
  if (queryStart !== -1) {
    pathEnd = queryStart
  }
  if (hashStart !== -1 && hashStart < pathEnd) {
    pathEnd = hashStart
  }

  const pathname = url.slice(pathStart, pathEnd)
  return pathname.length === 0 ? '/' : pathname
}
