/** Parse a CSS time (`250ms`, `1.8s`, or a unitless number of milliseconds). */
export function cssTimeToMilliseconds(raw: string): number {
  const first = raw.split(',')[0]?.trim() ?? ''
  if (first.length === 0) {
    return 0
  }
  const parsed = Number.parseFloat(first)
  if (!Number.isFinite(parsed)) {
    return 0
  }
  if (first.endsWith('ms')) {
    return parsed
  }
  if (first.endsWith('s')) {
    return parsed * 1000
  }
  return parsed
}

export function readCssTimeMilliseconds(element: Element, variableName: string): number {
  return cssTimeToMilliseconds(getComputedStyle(element).getPropertyValue(variableName))
}

export function readCssNumber(element: Element, variableName: string): number {
  const parsed = Number.parseFloat(getComputedStyle(element).getPropertyValue(variableName))
  return Number.isFinite(parsed) ? parsed : 0
}
