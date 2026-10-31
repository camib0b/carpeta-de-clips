import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const repoRoot = path.resolve(import.meta.dirname, '..')

const LITERAL_DURATION =
  /duration-\[|duration-\d|ease-\[|cubic-bezier|\d+(?:\.\d+)?ms\b|\d+(?:\.\d+)?s\b/g

function source(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

function stripMotionTokenBlock(fileSource: string): string {
  return fileSource.replace(/\/\* motion-tokens:start[\s\S]*?motion-tokens:end \*\//g, '')
}

function filesUnder(directoryName: string): string[] {
  const directory = path.join(repoRoot, directoryName)
  const found: string[] = []
  function walk(current: string) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
        continue
      }
      if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.css')) {
        found.push(path.relative(repoRoot, fullPath))
      }
    }
  }
  walk(directory)
  return found
}

function customProperty(fileSource: string, name: string): string {
  const match = fileSource.match(new RegExp(`${name}\\s*:\\s*([^;]+);`))
  assert.ok(match, `missing ${name}`)
  return match[1].trim()
}

function millisecondsFromToken(value: string, packageTokens: string): number {
  const variable = value.match(/^var\((--[\w-]+)\)$/)
  const resolved = variable ? customProperty(packageTokens, variable[1]) : value
  if (resolved.endsWith('ms')) {
    return Number.parseFloat(resolved)
  }
  if (resolved.endsWith('s')) {
    return Number.parseFloat(resolved) * 1000
  }
  throw new Error(`unsupported token value ${value}`)
}

test('app and components do not introduce literal motion durations', () => {
  const violations: string[] = []
  for (const relativePath of [...filesUnder('app'), ...filesUnder('components')]) {
    const stripped = stripMotionTokenBlock(source(relativePath))
    const lines = stripped.split('\n')
    for (let index = 0; index < lines.length; index += 1) {
      const matches = lines[index].match(LITERAL_DURATION)
      if (matches) {
        violations.push(`${relativePath}:${index + 1} ${matches.join(', ')}`)
      }
    }
  }
  assert.deepEqual(violations, [])
})

test('seek badge stops match the seek duration tokens', () => {
  const globals = source('app/globals.css')
  const packageTokens = source('node_modules/@camib0b/ui/dist/tokens.css')
  const seekIn = millisecondsFromToken(customProperty(globals, '--duration-seek-in'), packageTokens)
  const seekHold = millisecondsFromToken(
    customProperty(globals, '--duration-seek-hold'),
    packageTokens,
  )
  const seekOut = millisecondsFromToken(customProperty(globals, '--duration-seek-out'), packageTokens)
  const total = seekIn + seekHold + seekOut
  const keyframes = globals.match(/@keyframes keyboard-seek-badge \{([\s\S]*?)\n\}/)
  assert.ok(keyframes)
  const stops = [...keyframes[1].matchAll(/([\d.]+)%/g)].map((match) => Number(match[1]))
  assert.equal(stops.length, 4)
  assert.ok(Math.abs(stops[1] - (seekIn / total) * 100) < 0.0001)
  assert.ok(Math.abs(stops[2] - ((seekIn + seekHold) / total) * 100) < 0.0001)
  assert.match(
    globals,
    /animation-duration:\s*calc\(\s*var\(--duration-seek-in\)\s*\+\s*var\(--duration-seek-hold\)\s*\+\s*var\(--duration-seek-out\)\s*\)/,
  )
})

test('library curtain and landing delay read the shared motion tokens', () => {
  const globals = source('app/globals.css')
  assert.match(globals, /--curtain-duration:\s*var\(--duration-enter\)/)
  assert.match(globals, /--curtain-stagger:\s*var\(--duration-curtain-stagger\)/)
  assert.match(
    globals,
    /min\(\s*var\(--curtain-index, 0\),\s*var\(--curtain-stagger-cap\) - 1\s*\)/,
  )
  assert.match(
    globals,
    /animation-delay:\s*min\(\s*calc\(var\(--landing-index, 0\) \* var\(--duration-landing-step\)\),\s*var\(--duration-landing-cap\)\s*\)/,
  )
})
