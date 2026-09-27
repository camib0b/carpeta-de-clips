# Clip instances — local verification

## Remote migration (production D1)

```bash
pnpm exec wrangler d1 migrations apply carpeta-de-clips --remote
```

Same as `pnpm run db:migrate:remote`.

## UCB vs OR import (local D1)

Prerequisites: AVA export folder and `UC B vs OR.xml` (see `scripts/fixtures/ucb-vs-or-import-summary.txt` for derive output).

```bash
# 1. Derive instances from mp4 keyframes + XML (or use committed fixture)
pnpm exec tsx scripts/derive-clip-instances.ts \
  "/path/to/UCB vs OR" \
  "/path/to/UC B vs OR.xml" \
  --out scripts/fixtures/ucb-vs-or-derived.json

# 2. Build upsert payload (YouTube IDs match production catalog)
pnpm exec tsx scripts/build-ucb-or-import-payload.ts > /tmp/ucb-or.payload.json

# 3. Apply to local D1
pnpm exec tsx scripts/upsert-playlist.ts --local /tmp/ucb-or.payload.json

# 4. Confirm OR 16-yd has 14 plays
pnpm exec wrangler d1 execute carpeta-de-clips --local --command \
  "SELECT COUNT(*) FROM clip_instances WHERE clip_id = (SELECT id FROM clips WHERE youtube_id = 'J9UmilJC89Q')"
```

If `*.clips.json` sidecars exist, use `instances-from-sidecars.ts` instead of derive.

## Unit tests

```bash
pnpm test
```

## E2E (jugada 7)

1. `pnpm run preview` (uses local D1 from `.wrangler/state`).
2. Open `/uc-primera-b`, filter rival **Old Reds** (Sep 26 match).
3. Open **OR 16-yd** → **Jugadas** → click row **7/14** (timestamp ~1:37).
4. YouTube overlay should read **OR - 16-yd 7/14** (seek to ~97.6s).

Optional deep link: `/uc-primera-b?rival=old-reds&jugada=7` (opens modal when the clip is in the filtered list).

## Build

```bash
pnpm run build && pnpm exec opennextjs-cloudflare build
```
