# Carpeta de Clips

Hockey video library for working with the team. Source of truth is this GitHub repository. Production runs on Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare) and Wrangler.

Live site: [carpeta.cl](https://carpeta.cl)

## Getting started

Package manager is **pnpm** (`pnpm-lock.yaml`).

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Edit `app/page.tsx` (home) or `app/[teamSlug]/page.tsx` (team libraries); the page reloads as you save.

## Deploy (Cloudflare)

Production uses OpenNext + Wrangler on Cloudflare Workers:

```bash
pnpm run deploy
```

Related scripts:

- `pnpm run preview` — OpenNext build + local Workers preview
- `pnpm run upload` — OpenNext build + upload without the full deploy flow
- `pnpm run cf-typegen` — regenerate `cloudflare-env.d.ts` from Wrangler

Worker config lives in `wrangler.jsonc` (OpenNext) with R2 binding `CLIPPED_XML` → bucket `clipped-xml`. Match XML downloads (`Descargar XML`) depend on that binding and `lib/match-xml-catalog.ts`.

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
- [OpenNext on Cloudflare](https://opennext.js.org/cloudflare)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/)
