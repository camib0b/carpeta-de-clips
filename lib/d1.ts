import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * D1 catalog binding (`DB` → database `carpeta-de-clips`).
 * Must run in a request/runtime context, not during static generation.
 */
export async function getCatalogDatabase(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true })

  if (!env.DB) {
    throw new Error(
      'D1 binding DB is missing. Add it to wrangler.jsonc and run `pnpm run cf-typegen`.',
    )
  }

  return env.DB
}
