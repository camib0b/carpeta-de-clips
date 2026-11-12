import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { buttonVariants } from '../../components/ui/button'
import { cn } from '../utils'
import {
  LONG_OPPONENT_NAME,
  NARROW_CONTENT_PX,
  UNBREAKABLE_LABEL,
  estimatedLineWidthPx,
  longestToken,
} from '../break-ui/worst-case-fixtures'
import { GAME_CONCEPTS } from '../types'
import {
  appliedFilterChips,
  appliedFilterGroupClassName,
  CLEAR_FILTERS_LABEL,
  clearFiltersButtonClassName,
  CONCEPT_FILTER_LABEL,
  filterChipButtonClassName,
  filterResultCountLabel,
  filterResultLineClassName,
  REMOVE_FILTER_PREFIX,
  RIVAL_FILTER_LABEL,
  shareFiltersButtonClassName,
  withoutSelectedValue,
} from './filter-result-line'

const repoRoot = path.resolve(import.meta.dirname, '../..')
const MOBILE_CONTENT_PX = 360 - 48
const CHIP_CHROME_PX = 16 + 14 + 8
const LITERAL_DURATION =
  /duration-\[|duration-\d|ease-\[|cubic-bezier|\d+(?:\.\d+)?ms\b|\d+(?:\.\d+)?s\b/
const WHITESPACE_SEPARATOR = /\s+/
const CUSTOM_PROPERTY_DECLARATION = /--([a-z0-9-]+)\s*:\s*([^;]+);/g
const HSL_COMPONENT_TEXT = /([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/

function source(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

function mergedGhostButton(className: string): string {
  return cn(buttonVariants({ variant: 'ghost', size: 'sm', className }))
}

function classTokens(className: string): Set<string> {
  return new Set(className.split(WHITESPACE_SEPARATOR).filter((token) => token.length > 0))
}

test('idle counts use clip or clips, and a filtered sentence names the library total', () => {
  assert.equal(filterResultCountLabel(0, 0, false), '0 clips')
  assert.equal(filterResultCountLabel(1, 1, false), '1 clip')
  assert.equal(filterResultCountLabel(48, 48, false), '48 clips')
  assert.equal(filterResultCountLabel(1284, 1284, false), '1284 clips')

  assert.equal(filterResultCountLabel(0, 48, true), '0 de 48 clips')
  assert.equal(filterResultCountLabel(1, 48, true), '1 de 48 clips')
  assert.equal(filterResultCountLabel(12, 48, true), '12 de 48 clips')
  assert.equal(filterResultCountLabel(1, 1, true), '1 de 1 clip')
  assert.equal(filterResultCountLabel(0, 1, true), '0 de 1 clip')
  assert.equal(filterResultCountLabel(48, 48, true), '48 de 48 clips')
  assert.equal(filterResultCountLabel(1, 1284, true), '1 de 1284 clips')

  assert.equal(filterResultCountLabel(12, 48, true).includes('partido'), false)
  assert.equal(filterResultCountLabel(1, 1, false).includes('NaN'), false)
})

test('each selected value is its own chip and removing one keeps the rest', () => {
  const concepts = [...GAME_CONCEPTS]
  const rivals = [
    LONG_OPPONENT_NAME,
    'PWCC',
    'Jo',
    'J',
    UNBREAKABLE_LABEL,
    '<script>alert(1)</script>',
    'Ben & Jerry',
    'نور الهدى',
  ]
  const chips = appliedFilterChips(concepts, rivals)

  assert.equal(chips.length, concepts.length + rivals.length)
  assert.equal(chips[0]?.visibleLabel, `${CONCEPT_FILTER_LABEL}: ${concepts[0]}`)
  assert.equal(chips[0]?.removeLabel, `${REMOVE_FILTER_PREFIX} ${concepts[0]}`)

  const longRival = chips.find((chip) => chip.value === LONG_OPPONENT_NAME)
  assert.ok(longRival)
  assert.equal(longRival.visibleLabel, `${RIVAL_FILTER_LABEL}: ${LONG_OPPONENT_NAME}`)
  assert.equal(longRival.removeLabel, `${REMOVE_FILTER_PREFIX} ${LONG_OPPONENT_NAME}`)
  assert.equal(longRival.visibleLabel.includes(LONG_OPPONENT_NAME), true)

  const scriptChip = chips.find((chip) => chip.value === '<script>alert(1)</script>')
  assert.equal(scriptChip?.visibleLabel, 'Rival: <script>alert(1)</script>')
  assert.equal(scriptChip?.removeLabel, 'Quitar filtro <script>alert(1)</script>')

  const ampersand = chips.find((chip) => chip.value === 'Ben & Jerry')
  assert.equal(ampersand?.visibleLabel, 'Rival: Ben & Jerry')

  const original = ['Salidas', 'Presiones', 'Goles']
  const withoutPresiones = withoutSelectedValue(original, 'Presiones')
  assert.deepEqual(withoutPresiones, ['Salidas', 'Goles'])
  assert.deepEqual(original, ['Salidas', 'Presiones', 'Goles'])
  assert.equal(withoutSelectedValue(rivals, LONG_OPPONENT_NAME).includes(LONG_OPPONENT_NAME), false)
  assert.equal(withoutSelectedValue(rivals, LONG_OPPONENT_NAME).length, rivals.length - 1)
  assert.equal(CLEAR_FILTERS_LABEL, 'Limpiar')
})

test('long rival chips are wider than the 360px and 320px columns, so the row must truncate and wrap', () => {
  const longLabel = `${RIVAL_FILTER_LABEL}: ${LONG_OPPONENT_NAME}`
  const unbreakableLabel = `${RIVAL_FILTER_LABEL}: ${UNBREAKABLE_LABEL}`

  assert.ok(estimatedLineWidthPx(longLabel, 14) + CHIP_CHROME_PX > MOBILE_CONTENT_PX)
  assert.ok(estimatedLineWidthPx(unbreakableLabel, 14) + CHIP_CHROME_PX > NARROW_CONTENT_PX)
  assert.equal(longestToken(UNBREAKABLE_LABEL), UNBREAKABLE_LABEL)

  assert.match(filterChipButtonClassName, /max-w-full/)
  assert.match(filterChipButtonClassName, /min-w-0/)
  assert.match(appliedFilterGroupClassName, /max-w-full/)
  assert.match(appliedFilterGroupClassName, /min-w-0/)
  assert.match(filterResultLineClassName, /flex-wrap/)
  assert.match(filterResultLineClassName, /min-h-11/)
  assert.match(filterResultLineClassName, /gap-y-4/)
  assert.equal(filterResultLineClassName.includes('flex-nowrap'), false)
  assert.equal(filterResultLineClassName.includes('overflow-x-auto'), false)
  assert.equal(filterChipButtonClassName.includes('break-all'), false)
})

test('mobile hit area is 44px while the chip border box stays h-8', () => {
  assert.equal(8 * 4, 32)
  assert.equal(1.5 * 4, 6)
  assert.equal(32 + 6 + 6, 44)
  assert.equal(11 * 4, 44)
  assert.match(filterChipButtonClassName, /\bh-8\b/)
  assert.match(filterChipButtonClassName, /max-sm:before:-inset-y-1\.5/)
  assert.match(clearFiltersButtonClassName, /max-sm:before:-inset-y-1\.5/)
  assert.match(shareFiltersButtonClassName, /\bh-11\b/)
  assert.match(shareFiltersButtonClassName, /sm:h-8/)
})

test('enabled controls request the pointer and disabled ones do not', () => {
  for (const className of [
    filterChipButtonClassName,
    clearFiltersButtonClassName,
    shareFiltersButtonClassName,
  ]) {
    const merged = mergedGhostButton(className)
    const tokens = classTokens(merged)
    assert.equal(tokens.has('cursor-pointer'), true, merged)
    assert.equal(tokens.has('disabled:cursor-not-allowed'), true, merged)
    assert.equal(tokens.has('disabled:cursor-pointer'), false, merged)
    assert.equal(tokens.has('disabled:pointer-events-none'), false, merged)
    assert.equal(tokens.has('disabled:pointer-events-auto'), true, merged)
    assert.equal(tokens.has('text-state'), false, merged)
    assert.equal(tokens.has('border-state'), false, merged)
    assert.equal(tokens.has('bg-state'), false, merged)
    assert.equal(tokens.has('hover:bg-accent'), true, merged)
    assert.equal(tokens.has('hover:text-accent-foreground'), true, merged)
  }

  const share = classTokens(mergedGhostButton(shareFiltersButtonClassName))
  assert.equal(share.has('h-11'), true)
  assert.equal(share.has('h-8'), false)
  assert.equal(share.has('sm:h-8'), true)
  assert.equal(share.has('text-muted-foreground'), true)

  const chip = classTokens(mergedGhostButton(filterChipButtonClassName))
  assert.equal(chip.has('h-8'), true)
  assert.equal(chip.has('h-11'), false)
  assert.equal(chip.has('text-foreground'), true)
  assert.equal(chip.has('shrink-0'), false)
  assert.equal(chip.has('shrink'), true)
})

test('the result line, share control, and filter row use those classes', () => {
  const line = source('components/filter-result-line.tsx')
  const share = source('components/share-filters-button.tsx')
  const filters = source('components/video-filters.tsx')
  const grid = source('components/video-grid.tsx')
  const stylesheet = source('app/globals.css')

  assert.match(line, /role="status"/)
  assert.match(line, /aria-live="polite"/)
  assert.match(line, /aria-atomic="true"/)
  assert.match(line, /aria-label=\{chip\.removeLabel\}/)
  assert.match(line, /title=\{chip\.visibleLabel\}/)
  assert.match(line, /min-w-0 truncate/)
  assert.match(line, /dir="auto"/)
  assert.match(line, /filterChipButtonClassName/)
  assert.match(line, /clearFiltersButtonClassName/)
  assert.match(line, /onClearFilters/)
  assert.match(line, /text-foreground/)
  assert.match(line, /text-muted-foreground/)
  assert.match(line, /tabular-nums/)
  assert.equal(line.includes('dangerouslySetInnerHTML'), false)
  assert.equal(line.includes('text-state'), false)
  assert.equal(line.includes('filteredCount === 0'), false)
  assert.equal(LITERAL_DURATION.test(line), false)
  assert.equal(LITERAL_DURATION.test(source('lib/library-filters/filter-result-line.ts')), false)

  assert.match(share, /variant="ghost"/)
  assert.match(share, /shareFiltersButtonClassName/)
  assert.equal(share.includes('variant="outline"'), false)
  assert.equal(share.includes('text-state'), false)
  assert.equal(share.includes('border-state'), false)

  assert.ok(filters.indexOf('label="Rival"') < filters.indexOf('<ShareFiltersButton'))
  assert.match(filters, /items-end/)
  assert.match(filters, /sm:justify-between/)
  assert.match(filters, /sm:flex-1/)
  assert.match(filters, /label="Concepto"/)
  assert.match(filters, /label="Rival"/)

  assert.ok(grid.indexOf('<VideoFilters') < grid.indexOf('<FilterResultLine'))
  assert.match(grid, /space-y-3/)
  assert.equal(grid.includes("? 'clip' : 'clips'"), false)

  assert.match(stylesheet, /button:not\(:disabled\):not\(\[aria-disabled='true'\]\)/)
  assert.match(stylesheet, /cursor:\s*pointer/)
  assert.match(stylesheet, /button:is\(:disabled, \[aria-disabled='true'\]\)/)
  assert.match(stylesheet, /cursor:\s*not-allowed/)
})

type Hsl = [number, number, number]

function customProperties(block: string): Map<string, string> {
  const properties = new Map<string, string>()
  for (const match of block.matchAll(CUSTOM_PROPERTY_DECLARATION)) {
    properties.set(match[1], match[2].trim())
  }
  return properties
}

function bracedBlock(fileSource: string, startIndex: number): string {
  const open = fileSource.indexOf('{', startIndex)
  assert.ok(open >= 0)
  let depth = 0
  for (let index = open; index < fileSource.length; index += 1) {
    const character = fileSource[index]
    if (character === '{') depth += 1
    if (character === '}') {
      depth -= 1
      if (depth === 0) return fileSource.slice(open + 1, index)
    }
  }
  throw new Error('unclosed block')
}

function parseHsl(value: string): Hsl {
  const match = value.match(HSL_COMPONENT_TEXT)
  assert.ok(match, value)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function linearChannel(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(hsl: Hsl): number {
  const [hue, saturationPercent, lightnessPercent] = hsl
  const saturation = saturationPercent / 100
  const lightness = lightnessPercent / 100
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const hueSector = hue / 60
  const x = chroma * (1 - Math.abs((hueSector % 2) - 1))
  const match = lightness - chroma / 2
  let red = 0
  let green = 0
  let blue = 0
  if (hueSector < 1) {
    red = chroma
    green = x
  } else if (hueSector < 2) {
    red = x
    green = chroma
  } else if (hueSector < 3) {
    green = chroma
    blue = x
  } else if (hueSector < 4) {
    green = x
    blue = chroma
  } else if (hueSector < 5) {
    red = x
    blue = chroma
  } else {
    red = chroma
    blue = x
  }
  const linearRed = linearChannel(red + match)
  const linearGreen = linearChannel(green + match)
  const linearBlue = linearChannel(blue + match)
  return 0.2126 * linearRed + 0.7152 * linearGreen + 0.0722 * linearBlue
}

function contrastRatio(foreground: Hsl, background: Hsl): number {
  const foregroundLuminance = relativeLuminance(foreground)
  const backgroundLuminance = relativeLuminance(background)
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

test('result line and share colors meet 4.5:1 text and 3:1 focus ring in light and dark', () => {
  const tokens = source('node_modules/@camib0b/ui/dist/tokens.css')
  const globals = source('app/globals.css')
  const light = customProperties(bracedBlock(tokens, tokens.indexOf(':root')))
  const darkMedia = bracedBlock(globals, globals.indexOf('@media (prefers-color-scheme: dark)'))
  const dark = customProperties(bracedBlock(darkMedia, darkMedia.indexOf(':root')))
  const lightRoot = customProperties(bracedBlock(globals, globals.indexOf(':root')))

  const lightBackground = parseHsl(light.get('background') ?? '')
  const lightForeground = parseHsl(light.get('foreground') ?? '')
  const lightMuted = parseHsl(light.get('muted-foreground') ?? '')
  const lightAccent = parseHsl(light.get('accent') ?? '')
  const lightAccentForeground = parseHsl(light.get('accent-foreground') ?? '')
  const lightState = parseHsl(lightRoot.get('state') ?? '')

  const darkBackground = parseHsl(dark.get('background') ?? '')
  const darkForeground = parseHsl(dark.get('foreground') ?? '')
  const darkMuted = parseHsl(dark.get('muted-foreground') ?? '')
  const darkAccent = parseHsl(dark.get('accent') ?? '')
  const darkAccentForeground = parseHsl(dark.get('accent-foreground') ?? '')
  const darkState = parseHsl(dark.get('state') ?? '')

  const textPairs: Array<[string, Hsl, Hsl]> = [
    ['light foreground on background', lightForeground, lightBackground],
    ['light muted on background', lightMuted, lightBackground],
    ['light accent foreground on accent', lightAccentForeground, lightAccent],
    ['dark foreground on background', darkForeground, darkBackground],
    ['dark muted on background', darkMuted, darkBackground],
    ['dark accent foreground on accent', darkAccentForeground, darkAccent],
  ]
  for (const [name, foreground, background] of textPairs) {
    const ratio = contrastRatio(foreground, background)
    assert.ok(ratio >= 4.5, `${name} is ${ratio.toFixed(2)}`)
  }

  assert.ok(contrastRatio(lightState, lightBackground) >= 3)
  assert.ok(contrastRatio(darkState, darkBackground) >= 3)

  // Muted text on the accent hover fill fails in light, so hover must switch tokens.
  assert.ok(contrastRatio(lightMuted, lightAccent) < 4.5)
})
