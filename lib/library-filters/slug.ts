import { GAME_CONCEPTS } from '@/lib/types'

/**
 * Normalize a display value into a URL-safe slug.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const CONCEPT_SLUG_TO_LABEL = new Map<string, string>()
const CONCEPT_LABEL_TO_SLUG = new Map<string, string>()

for (const concept of GAME_CONCEPTS) {
  if (concept === 'Todos los Conceptos') continue
  const slug = slugify(concept)
  CONCEPT_SLUG_TO_LABEL.set(slug, concept)
  CONCEPT_LABEL_TO_SLUG.set(concept, slug)
}

export function conceptToSlug(concept: string): string | null {
  return CONCEPT_LABEL_TO_SLUG.get(concept) ?? null
}

export function slugToConcept(slug: string): string | null {
  return CONCEPT_SLUG_TO_LABEL.get(slug) ?? null
}

export function rivalToSlug(rival: string): string {
  return slugify(rival)
}

export function slugToRival(slug: string, rivals: string[]): string | null {
  const match = rivals.find((rival) => rival !== 'Todos los Rivales' && rivalToSlug(rival) === slug)
  return match ?? null
}
