# Carpeta de Clips

Hockey video library for working with the team. Source of truth for **code** is this GitHub repository. The **clip catalog** lives in Cloudflare D1. XML blobs stay in R2. Production runs on Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare) and Wrangler.

Live site: [carpeta.cl](https://carpeta.cl)

## Getting started

Package manager is **pnpm** (`pnpm-lock.yaml`).

```bash
pnpm install
pnpm run db:migrate:local
pnpm dev
```

`db:migrate:local` applies schema + the catalog seed to Wrangler’s local D1 (needed before home/team pages can list clips).

Open [http://localhost:3000](http://localhost:3000). Edit `app/page.tsx` (home) or `app/[teamSlug]/page.tsx` (team libraries); the page reloads as you save.

## Catalog database (D1)

| | |
|---|---|
| Database name | `carpeta-de-clips` |
| Binding | `DB` (`wrangler.jsonc`) |
| Database id | `6ac20d29-8e80-42d2-8330-ed7a7901d103` |
| Migrations | `migrations/` |

```bash
# Local (wrangler state under .wrangler/)
pnpm run db:migrate:local

# Production: schema (0001) + catalog seed (0002) in one command
pnpm run db:migrate:remote
```

Those commands wrap:

```bash
pnpm exec wrangler d1 migrations apply carpeta-de-clips --local
pnpm exec wrangler d1 migrations apply carpeta-de-clips --remote
```

There is **no separate remote seed command**. `0002_seed_catalog.sql` is the seed (`INSERT OR IGNORE` of libraries, matches, and clips). Apply `--remote` before a deploy that reads D1, or the live site will be empty.

- `0001_create_catalog.sql` — `libraries`, `matches`, `clips` + indexes (`matches.division` is the league, e.g. Primera A)
- `0002_seed_catalog.sql` — snapshot of the former clip-catalog array (scores/dates copied, not invented; `libraryName` → `library_id`, `division` → `matches.division`)

Regenerate `0002` only if the TypeScript sources are restored from git history:

```bash
pnpm run db:seed:generate
```

New playlists: upsert into D1 with `scripts/upsert-playlist.ts` (see `.cursor/skills/add-youtube-playlist`). Do not add clips back into a TypeScript array.

Smoke-check local D1:

```bash
pnpm run db:parity
```

## Deploy (Cloudflare)

Production uses OpenNext + Wrangler on Cloudflare Workers:

```bash
pnpm run db:migrate:remote   # once, or whenever migrations/ changes
pnpm run deploy
```

Related scripts:

- `pnpm run preview` — OpenNext build + local Workers preview (uses local D1; migrate first)
- `pnpm run upload` — OpenNext build + upload without the full deploy flow
- `pnpm run cf-typegen` — regenerate `cloudflare-env.d.ts` from Wrangler

Worker config lives in `wrangler.jsonc` (OpenNext):

- R2 binding `CLIPPED_XML` → bucket `clipped-xml` (XML file bytes)
- D1 binding `DB` → database `carpeta-de-clips` (libraries / matches / clips, including `r2_xml_object_key`)

Home and team library pages are **dynamic** (`force-dynamic`) so they read D1 at request time instead of baking the catalog into the Worker bundle.

**Cloudflare Workers Builds** (Dashboard → Workers → Builds): set the build command to:

```bash
pnpm exec opennextjs-cloudflare build
```

Do not use `pnpm run build` there — that is Next.js only and does not produce the Worker.

**Dashboard check:** Wrangler config is enough to bind `DB` on the next deploy. Confirm in Cloudflare Dashboard → Workers → `carpeta-de-clips` → Bindings that `DB` points at database `carpeta-de-clips`. Apply remote migrations before or with that deploy (`0001`/`0002` are `IF NOT EXISTS` / `INSERT OR IGNORE`, so re-running is safe).

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
- [OpenNext on Cloudflare](https://opennext.js.org/cloudflare)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/)
- [D1](https://developers.cloudflare.com/d1/)
