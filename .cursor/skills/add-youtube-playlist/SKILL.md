---
name: add-youtube-playlist
description: >-
  Import YouTube playlist videos into carpeta-de-clips team library pages,
  including wiring the match XML from R2 clipped-xml so the Descargar XML
  button appears on the match banner. Maps each video title to a gameConcept
  filter from the analyzing team's point of view (rival salidas / 50-yd /
  75-yd → Presiones for UC Primera B). Use when the user provides a YouTube
  playlist link plus a team, asks to add missing playlist clips, sync new
  videos to an existing playlist, or wire match XML downloads from R2.
---

# Add YouTube Playlist Clips

Import a YouTube playlist into the correct **D1 library** so filters work on carpeta.cl.

The clip catalog is Cloudflare D1 (`carpeta-de-clips`, binding `DB`). XML blobs stay in R2 `clipped-xml`. Do **not** append to `lib/clip-catalog.ts` (the `videoClips` array was removed).

## Required inputs

- YouTube playlist URL (`list=PL…`)
- **Target library**: UC team page (e.g. UC Primera B → `uc-primera-b`) **or** Others (`others`)
- Match metadata when adding a **new** match: date, home/away, score, optional shootout winner, optional `place`
- **R2 XML object name** in bucket `clipped-xml` (e.g. `OR vs UCB.xml`) — required for new matches so the download button can be enabled

If metadata or the XML filename is missing for a new match, ask before inventing scores, dates, or object keys.

## Choose the library target

| User says | `library_id` | Key fields |
|-----------|--------------|------------|
| UC Primera B / UC Sub-16 A | `uc-primera-b` / `uc-sub-16-a` | `rival_label` = **opponent only** (e.g. `COGS`) |
| Others library / Category Others | `others` | `rival_label` = `Club A vs Club B`; `division` usually `Primera A` |

**Home team** = first club named in the matchup (e.g. “Manquehue vs Old Girls” → Manquehue home).

**Primera A** → set `division: 'Primera A'` on the **match** (common for Others and for UC away fixtures in Primera A).

See [examples.md](examples.md) for JSON/SQL templates from real imports.

## Point of view (critical)

The filters used on videos are from the team's point of view, so for example: when the rival team has "salidas", and posession (50 yd, 75 yd), that is accounted as UC B Pressure category ("presiones").

For **UC Primera B** specifically:

| Stored `game_concept` (rival subject) | Shown filter after POV |
|---------------------------------------|------------------------|
| `Salidas` | `Presiones` |
| `Juego 50-yds` | `Presiones` |
| `Juego 75-yds` | `Presiones` |
| `Ingresos al área` | `Defensa de área` |

Do **not** store `Presiones` on rival clips when using the COGS-style pattern: store the literal concept and let `remapGameConceptToTeamPerspective` remap at read time. Titles must start with the rival name (or a configured alias like `MQA`, `OR`).

UC-subject titles (`UCB …`, `UC B …`, `Salidas`, `Presión sobre …`, etc.) are never remapped.

**Others library** has no POV remapping — store concepts literally from each club's actions in the title.

The agent must also know basic field hockey terminology both in Spanish and in English in order to accurately interpret each video title, which corresponds to a game concept. See [terminology.md](terminology.md).

## Workflow

Copy and track:

```
Playlist import:
- [ ] 1. Fetch playlist videos (id + title)
- [ ] 2. Diff against existing youtube_id rows in D1
- [ ] 3. Map each title → game_concept (+ team aliases if needed)
- [ ] 4. Upsert match + INSERT clips (ON CONFLICT youtube_id DO NOTHING)
- [ ] 5. Set matches.r2_xml_object_key (enables Descargar XML)
- [ ] 6. Verify clips + XML key in D1
- [ ] 7. Commit / push / deploy only if the user asks
```

### 1. Fetch videos

Preferred:

```bash
yt-dlp --flat-playlist --print "%(id)s|||%(title)s|||%(playlist_index)s" "PLAYLIST_URL"
```

Fallback (no yt-dlp):

```bash
curl -sL "PLAYLIST_URL" \
  | grep -oE '"videoId":"[^"]+"|"title":\{"runs":\[\{"text":"[^"]+"\}\]' \
  | awk '!seen[$0]++'
```

**Skip** entries titled `[Video borrado]`, private, or duplicate ids in output. Prefer exact YouTube titles (including accents/spacing).

### 2. Diff existing clips

Query D1 (local while developing, `--remote` for production):

```bash
pnpm exec wrangler d1 execute carpeta-de-clips --local --json --command \
  "SELECT youtube_id FROM clips INNER JOIN matches ON matches.id = clips.match_id WHERE matches.id = 'STORAGE_SLUG'"
```

Or by playlist:

```bash
pnpm exec wrangler d1 execute carpeta-de-clips --local --json --command \
  "SELECT youtube_id FROM clips INNER JOIN matches ON matches.id = clips.match_id WHERE matches.youtube_playlist_id = 'PLxxxxx'"
```

- **New match** → insert all non-deleted videos.
- **Sync existing playlist** → insert **only** missing `youtube_id`s (user: “new videos added to playlist”). `ON CONFLICT (youtube_id) DO NOTHING` is the safety net.

Clip identity is **`youtube_id`**, not the integer `clips.id`.

### 3. Map titles → concepts

Allowed `game_concept` values live in `GAME_CONCEPTS` in `lib/types.ts` (never invent new ones). Dropdown “all” labels are `ALL_CONCEPTS_FILTER_LABEL` / `ALL_RIVALS_FILTER_LABEL` — do not store those.

Common title → concept patterns:

| Title cues | `game_concept` |
|------------|----------------|
| Salidas / build-out / exits | `Salidas` |
| Presión / pressure (already UC POV) | `Presiones` |
| Goles / Gol | `Goles` |
| Cortos / corners cortos | `Corner Cortos` |
| Ingresos / entrando al área / circle entry | `Ingresos al área` |
| Defensa de área | `Defensa de área` |
| 50 yd / 50-yd / midfield possession | `Juego 50-yds` |
| 75 yd / 75-yd / attacking 25 | `Juego 75-yds` |
| Shoot out / penales / PS | `Shoot Outs` |
| Partido completo / full match | `Partido Completo` |
| Flicks | `Flicks` |
| Pérdidas / turnovers | `Pérdidas` |

If the title uses a rival AKA (`MQA`, `OR`, …) that does not match `home_team`/`away_team`, add the alias in `OPPONENT_TITLE_ALIASES` in `lib/team-perspective.ts`.

**Old Gabs-style playlists** use neutral UC-perspective titles (`Ingresos al área`, `Defensa de área`, `Salidas`, `Presión sobre salidas`) — map directly; no rival-prefix remapping.

### 4. Upsert match + insert clips

Match id is the storage slug from `storageSlugFromClip` / `matchKeyToStorageSlug`:

- Key: `date|homeTeam|awayTeam|rivalTeam` (+ `|Others` when `libraryName` is Others)
- Slug: spaces → `_`, joined with `--`

Every clip in the match shares match-level fields (`played_on`, teams, score, `rival_label`, `division`, `place`). Clips store `youtube_id`, `title`, `game_concept`, `uploaded_at` (ISO, descending within the match for grid sort).

Write a payload JSON (see [examples.md](examples.md)) and apply:

```bash
pnpm exec tsx scripts/upsert-playlist.ts --sql-only payload.json
pnpm exec tsx scripts/upsert-playlist.ts --local payload.json
pnpm exec tsx scripts/upsert-playlist.ts --remote payload.json
```

The script upserts the match (`ON CONFLICT (id)`) and inserts clips with `ON CONFLICT (youtube_id) DO NOTHING`. It will not overwrite an existing `r2_xml_object_key` with NULL (`COALESCE`).

SQL lives in `lib/catalog-upsert.ts` if you need to bind statements from a Worker.

### 5. Wire match XML from R2 (required for new matches)

Match event XMLs live in the Cloudflare R2 bucket **`clipped-xml`** (binding `CLIPPED_XML`). Setting `matches.r2_xml_object_key` is what turns on the **Descargar XML** button — no separate UI change is needed.

**How the button appears**

1. Seed/upsert stores `r2_xml_object_key` on the match row (`matches.id` = storage slug).
2. `getTeamLibraryClips` copies that key onto each `VideoClip.r2XmlObjectKey`.
3. `getMatchXmlAvailabilityByStorageSlug` returns `true` when the key is set (or a local `public/match-xml/{slug}.xml` exists).
4. `MatchXmlDownloadButton` renders **only when** `available === true`. It links to `/api/match-xml/{storageSlug}?filename=…`, which reads bytes from R2 via `env.CLIPPED_XML`.

**Do this every time you add a new match** (or when the user names an XML for an existing match):

1. Compute `storageSlug` — must match home / away / rival / Others suffix exactly.
2. Ask for the exact R2 object name if the user did not provide it (do not guess filenames).
3. Set `r2XmlObjectKey` on the upsert payload (the object name is also the download filename).

For Others matches the slug includes `--Others` because `libraryName: 'Others'` is part of the match key.

**Sync-only imports**: skip this step unless XML was never wired.

Do **not** upload XML from the agent unless asked — the file must already exist in R2.

### 6. Verify

```bash
pnpm exec wrangler d1 execute carpeta-de-clips --local --json --command "
SELECT clips.title, clips.game_concept, matches.division, matches.r2_xml_object_key, matches.id
FROM clips
INNER JOIN matches ON matches.id = clips.match_id
WHERE matches.played_on = 'YYYY-MM-DD'
  AND matches.library_id = 'TEAM-SLUG'
ORDER BY clips.uploaded_at DESC
"
```

POV remapping is **not** stored in D1. Confirm it by loading the team page (or calling `remapGameConceptToTeamPerspective`). For **UC Primera B**: rival salidas / 50 / 75 → `Presiones` and rival ingresos → `Defensa de área`.

For **Others**: confirm clip count matches playlist (minus deleted videos).

For **XML**: `r2_xml_object_key` must be non-null after cataloging.

Use `--remote` when verifying production.

### 7. Ship

Only when asked: the catalog change is **in D1**, so run `tsx scripts/upsert-playlist.ts --remote payload.json`. Commit `lib/team-perspective.ts` if aliases were added. Then `git push` and `pnpm run deploy` if Worker code changed.

Do not re-add clips to a TypeScript array. Do not invent scores or dates.

## Key files

| File | Role |
|------|------|
| `migrations/` | D1 schema + initial catalog seed |
| `lib/clip-catalog.ts` | App-facing re-exports: `getTeamLibraryClips`, `listTeamLibraryRivals` |
| `lib/catalog.ts` | D1 queries used by those re-exports |
| `lib/catalog-upsert.ts` | Match upsert + clip insert SQL |
| `scripts/upsert-playlist.ts` | Apply a playlist JSON to local or remote D1 |
| `lib/types.ts` | `GAME_CONCEPTS`, `VideoClip`, `ALL_*_FILTER_LABEL` |
| `lib/team-perspective.ts` | `remapGameConceptToTeamPerspective` + title aliases |
| `lib/match-xml.server.ts` | `getMatchXmlAvailabilityByStorageSlug` + R2/local read |
| `lib/match-display.ts` | `MatchSummary`, `listUniqueMatchSummaries` |
| `lib/match-keys.ts` | Match key / storage slug (`matches.id`) |
| `wrangler.jsonc` | Binding `DB` → D1 `carpeta-de-clips` |

## Additional resources

- Field hockey ES/EN title cues: [terminology.md](terminology.md)
- Real import templates & sync example: [examples.md](examples.md)
