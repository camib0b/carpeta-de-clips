import assert from 'node:assert/strict'
import test from 'node:test'

import {
  hrefWithSearchParam,
  pathnameFromAbsoluteUrl,
  searchParamsFromAbsoluteUrl,
} from './request-url'

const ABSOLUTE_URLS = [
  'https://carpeta.cl/',
  'https://carpeta.cl/uc-primera-b',
  'https://carpeta.cl/uc-primera-b?data=worst',
  'https://carpeta.cl/uc-primera-b?data=worst&extra=1#equipos',
  'https://carpeta.cl/uc-primera-b#equipos',
  'https://carpeta.cl/api/team-inbox?action=create',
  'https://carpeta.cl/api/team-inbox?submissionId=abc&uploadId=up&partNumber=2',
  'https://carpeta.cl/api/match-xml/slug?filename=UC%20vs%20OR.xml',
  'https://carpeta.cl/path?a=1&a=2',
  'https://carpeta.cl/path?q=a+b&r=a%20b',
  'https://carpeta.cl/path?weird=%',
  'https://carpeta.cl/path?a=1?b=2',
  'https://user:pass@host:8443/path?a=1&b=2#h',
  'https://[::1]/foo?a=1',
  'http://localhost:3000/uc?modalData=many#x',
  'https://carpeta.cl/path?',
  'https://carpeta.cl/path?a=',
]

test('searchParamsFromAbsoluteUrl matches URL search param reads', () => {
  for (const url of ABSOLUTE_URLS) {
    const parsed = new URL(url)
    const params = searchParamsFromAbsoluteUrl(url)
    const names = new Set([...parsed.searchParams.keys(), ...params.keys()])
    for (const name of names) {
      assert.deepEqual(
        params.getAll(name),
        parsed.searchParams.getAll(name),
        `${url} ${name}`,
      )
    }
  }

  assert.equal(
    searchParamsFromAbsoluteUrl(
      'https://carpeta.cl/api/match-xml/slug?filename=UC%20vs%20OR.xml',
    ).get('filename'),
    'UC vs OR.xml',
  )
  assert.equal(
    searchParamsFromAbsoluteUrl('https://carpeta.cl/api/team-inbox').get('action'),
    null,
  )
})

test('hrefWithSearchParam matches a URL search mutation of location parts', () => {
  const cases: Array<[string, string, string | null]> = [
    ['https://carpeta.cl/uc', 'data', 'worst'],
    ['https://carpeta.cl/uc?data=worst', 'data', null],
    ['https://carpeta.cl/uc?extra=1&data=worst#h', 'data', null],
    ['https://carpeta.cl/uc?data=demo&x=1', 'data', 'worst'],
    ['https://carpeta.cl/uc?modalData=many#clip', 'modalData', null],
    ['https://carpeta.cl/uc?a=b+c&data=one', 'data', 'error'],
    ['https://carpeta.cl/a%20b?data=worst', 'data', null],
    ['https://carpeta.cl/uc?data=worst&data=demo', 'data', null],
    ['https://carpeta.cl/uc?', 'data', 'worst'],
    ['https://carpeta.cl/uc?q=%E2%9C%93', 'data', 'worst'],
    ['https://carpeta.cl/api/match-xml/slug?filename=UC%20vs%20OR.xml', 'data', 'worst'],
    ['https://carpeta.cl/uc?filename=UC%20vs%20OR.xml&data=worst', 'data', null],
  ]

  for (const [href, name, value] of cases) {
    const url = new URL(href)
    if (value == null) {
      url.searchParams.delete(name)
    } else {
      url.searchParams.set(name, value)
    }
    const expected = `${url.pathname}${url.search}${url.hash}`

    const source = new URL(href)
    const actual = hrefWithSearchParam(
      { pathname: source.pathname, search: source.search, hash: source.hash },
      name,
      value,
    )
    assert.equal(actual, expected, href)
  }
})

test('pathnameFromAbsoluteUrl matches URL.pathname for serialized request URLs', () => {
  for (const url of ABSOLUTE_URLS) {
    assert.equal(pathnameFromAbsoluteUrl(url), new URL(url).pathname, url)
  }

  assert.equal(pathnameFromAbsoluteUrl('https://carpeta.cl'), '/')
  assert.equal(pathnameFromAbsoluteUrl('https://carpeta.cl/'), '/')

  const unnormalized = [
    'https://carpeta.cl/foo/../bar',
    'https://carpeta.cl/foo/./bar',
    'https://carpeta.cl/foo\\bar',
    'https://carpeta.cl/ü?clip=1',
    'https://user:pass@[::1]:8443/a/b?x=1#h',
  ]
  for (const url of unnormalized) {
    const serialized = new URL(url).href
    assert.equal(
      pathnameFromAbsoluteUrl(serialized),
      new URL(serialized).pathname,
      serialized,
    )
  }

  assert.equal(pathnameFromAbsoluteUrl('https://carpeta.cl/foo/../bar'), '/foo/../bar')
  assert.equal(new URL('https://carpeta.cl/foo/../bar').pathname, '/bar')
})
