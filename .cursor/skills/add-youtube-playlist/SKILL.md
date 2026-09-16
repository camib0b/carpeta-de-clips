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

Import a YouTube playlist into the correct team section of this app so filters work.

## Required inputs

- YouTube playlist URL (`list=PL…`)
- **Target library**: UC team page (e.g. UC Primera B → `uc-primera-b`) **or** Others (`others`)
- Match metadata when adding a **new** match: date, home/away, score, optional shootout winner, optional `place`
- **R2 XML object name** in bucket `clipped-xml` (e.g. `OR vs UCB.xml`) — required for new matches so the download button can be enabled

If metadata or the XML filename is missing for a new match, ask before inventing scores, dates, or object keys.

## Choose the library target

| User says | Where clips live | Key fields |
|-----------|------------------|------------|
| UC Primera B / UC Sub-16 A | That team's section in `lib/clip-catalog.ts` | `homeTeam` / `awayTeam` includes UC; `rivalTeam` = **opponent only** (e.g. `COGS`) |
| Others library / Category Others | `// Others - Primera A - …` section | `libraryName: 'Others'`, `division: 'Primera A'`, `rivalTeam: 'Club A vs Club B'` |

**Home team** = first club named in the matchup (e.g. “Manquehue vs Old Girls” → Manquehue home).

**Primera A** → set `division: 'Primera A'` on every clip in the match (common for Others and for UC away fixtures in Primera A).

See [examples.md](examples.md) for copy-paste templates from real imports.

## Point of view (critical)

The filters used on videos are from the team's point of view, so for example: when the rival team has "salidas", and posession (50 yd, 75 yd), that is accounted as UC B Pressure category ("presiones").

For **UC Primera B** specifically:

| Stored `gameConcept` (rival subject) | Shown filter after POV |
|--------------------------------------|------------------------|
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
- [ ] 2. Diff against existing youtubeIds for that match/team
- [ ] 3. Map each title → gameConcept (+ team aliases if needed)
- [ ] 4. Append VideoClip entries in lib/clip-catalog.ts
- [ ] 5. Wire R2 XML in lib/match-xml-catalog.ts (enables Descargar XML)
- [ ] 6. Optional: playlist id in db/seed.ts (if touching seed)
- [ ] 7. Verify clips + XML availability (download button will show)
- [ ] 8. Commit / push / deploy only if the user asks
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

Find the match section in `lib/clip-catalog.ts` (comment header includes playlist id). Compare playlist `youtubeId`s to existing ones.

- **New match** → add all non-deleted videos.
- **Sync existing playlist** → append **only** missing `youtubeId`s (user: “new videos added to playlist”).

### 3. Map titles → concepts

Allowed `gameConcept` values live in `GAME_CONCEPTS` in `lib/types.ts` (never invent new ones).

Common title → concept patterns:

| Title cues | `gameConcept` |
|------------|---------------|
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

If the title uses a rival AKA (`MQA`, `OR`, …) that does not match `homeTeam`/`awayTeam`, add the alias in `OPPONENT_TITLE_ALIASES` in `lib/team-perspective.ts`.

**Old Gabs-style playlists** use neutral UC-perspective titles (`Ingresos al área`, `Defensa de área`, `Salidas`, `Presión sobre salidas`) — map directly; no rival-prefix remapping.

### 4. Write `lib/clip-catalog.ts` clips

Follow the nearest existing playlist in that team section (see [examples.md](examples.md)).

Every clip in the match shares:

- `date`, `homeTeam`, `awayTeam`, `rivalTeam`
- optional `homeGoals` / `awayGoals` / `shootoutWinner` / `division` / `place` / `libraryName`
- unique numeric `id` — **grep all** `id: '` in `lib/clip-catalog.ts` and use max + 1 (duplicate ids break filters)
- `youtubeId`, `title` (exact YouTube title)
- `uploadedAt` ISO timestamps, descending within the match (controls grid sort)
- comment header: `// Team - Home vs Away (Playlist: PLxxxxx)` or `// Others - Primera A - …`

Place new **Others** sections near other Others blocks (end of `videoClips` array is fine). Group **UC Primera B** matches in the UC Primera B portion of the file.

Match key / storage slug (for XML / optional seed):

- Key: `date|homeTeam|awayTeam|rivalTeam` (+ `|Others` when `libraryName: 'Others'`)
- Slug: spaces → `_`, joined with `--` via `matchKeyToStorageSlug`

### 5. Wire match XML from R2 (required for new matches)

Match event XMLs live in the Cloudflare R2 bucket **`clipped-xml`** (binding `CLIPPED_XML`). Hooking the file up is what turns on the **Descargar XML** button in the match context banner — no separate UI change is needed.

**How the button appears**

1. `lib/match-xml-catalog.ts` catalogs the match `storageSlug` → R2 `objectKey`.
2. `isMatchXmlAvailable(storageSlug)` returns `true` when the slug has an R2 override (`hasMatchXmlR2ObjectOverride`) or a local file.
3. Team pages pass `matchXmlAvailability` into `MatchContextBanner`.
4. `MatchXmlDownloadButton` renders **only when** `available === true` (label: “Descargar XML”). It links to `/api/match-xml/{storageSlug}?filename=…`, which reads bytes from R2 via `env.CLIPPED_XML`.

**Do this every time you add a new match** (or when the user names an XML for an existing match):

1. Compute `storageSlug` from the clips (`storageSlugFromClip` / `matchKeyToStorageSlug`) — must match `homeTeam` / `awayTeam` / `rivalTeam` / `libraryName` exactly.
2. Ask for the exact R2 object name if the user did not provide it (do not guess filenames).
3. Add an entry to `MATCH_XML_R2_OBJECT_BY_STORAGE_SLUG` in `lib/match-xml-catalog.ts`:

```ts
'YYYY-MM-DD--Home--Away--Rival': {
  objectKey: 'Exact R2 filename.xml',
  downloadFilename: 'Exact R2 filename.xml',
},
```

For Others matches the slug includes `--Others` (because `libraryName: 'Others'` is part of the match key).

**Sync-only imports** (new videos on an already-cataloged match): skip this step unless XML was never wired.

Do **not** upload XML from the agent unless asked — the file must already exist in R2. Cataloging alone enables the download button.

### 6. Optional `db/seed.ts`

Add playlist id to `PLAYLIST_BY_MATCH_KEY` using the match key above. The whole `db/` tree is often **untracked local WIP** — updating seed is fine, but playlist commits that shipped historically included **`lib/clip-catalog.ts`** (+ `lib/match-xml-catalog.ts` when XML was wired). App reads static data unless `USE_DATABASE=true`.

### 7. Verify

```bash
npx tsx -e "
import { getTeamLibraryClips } from './lib/clip-catalog'
import { storageSlugFromClip } from './lib/match-keys'
import { isMatchXmlAvailable } from './lib/match-xml.server'
import { getMatchXmlR2ObjectKey } from './lib/match-xml-catalog'

const clips = getTeamLibraryClips('TEAM-SLUG').filter(c => c.date === 'YYYY-MM-DD')
for (const c of clips) console.log(c.title, '->', c.gameConcept)
const slug = storageSlugFromClip(clips[0])
console.log('count:', clips.length)
console.log('slug:', slug)
console.log('r2:', getMatchXmlR2ObjectKey(slug))
console.log('xmlAvailable (→ Descargar XML button):', isMatchXmlAvailable(slug))
"
```

For **UC Primera B**: confirm rival salidas / 50 / 75 → `Presiones` and rival ingresos → `Defensa de área`.

For **Others**: confirm clip count matches playlist (minus deleted videos).

For **XML**: `xmlAvailable` must be `true` after cataloging. That is enough for the banner download button on the team page (filter by rival/date to see the match row).

### 8. Ship

Only when asked: commit **only** the files you changed for this import (`lib/clip-catalog.ts`, `lib/match-xml-catalog.ts` when XML was wired, and `lib/team-perspective.ts` if aliases were added). Then `git push` and `pnpm run deploy`. Do not include unrelated WIP (`db/`, work-window, lockfile, `.gitignore`, etc.).

## Key files

| File | Role |
|------|------|
| `lib/clip-catalog.ts` | Clip catalog + team sections (**primary ship target**) |
| `lib/types.ts` | `GAME_CONCEPTS`, `VideoClip` |
| `lib/team-perspective.ts` | UC Primera B POV remaps + title aliases |
| `lib/match-xml-catalog.ts` | R2 XML object keys (**enables Descargar XML**) |
| `lib/match-xml.server.ts` | Availability + R2/local read |
| `components/match-xml-download-button.tsx` | Banner download UI (auto via `available`) |
| `components/match-context-banner.tsx` | Passes `canDownloadMatchXml` into the button |
| `lib/match-keys.ts` | Match key / storage slug |
| `db/seed.ts` | Optional playlist id map (whole `db/` may be untracked WIP) |

## Additional resources

- Field hockey ES/EN title cues: [terminology.md](terminology.md)
- Real import templates & sync example: [examples.md](examples.md)
