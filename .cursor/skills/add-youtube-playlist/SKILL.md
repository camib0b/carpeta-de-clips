---
name: add-youtube-playlist
description: >-
  Import YouTube playlist videos into carpeta-de-clips team library pages.
  Maps each video title to a gameConcept filter from the analyzing team's
  point of view (rival salidas / 50-yd / 75-yd → Presiones for UC Primera B).
  Use when the user provides a YouTube playlist link plus a team, asks to add
  missing playlist clips, sync new videos to an existing playlist, or wire
  match XML downloads from R2 clipped-xml.
---

# Add YouTube Playlist Clips

Import a YouTube playlist into the correct team section of this app so filters work.

## Required inputs

- YouTube playlist URL (`list=PL…`)
- **Target library**: UC team page (e.g. UC Primera B → `uc-primera-b`) **or** Others (`others`)
- Match metadata when adding a **new** match: date, home/away, score, optional shootout winner, optional `place`, optional R2 XML filename

If metadata is missing for a new match, ask before inventing scores or dates.

## Choose the library target

| User says | Where clips live | Key fields |
|-----------|------------------|------------|
| UC Primera B / UC Sub-16 A / UC Primera A | That team's section in `lib/data.ts` | `homeTeam` / `awayTeam` includes UC; `rivalTeam` = **opponent only** (e.g. `COGS`) |
| Others library / Category Others | `// Others - Primera A - …` section | `collection: 'Others'`, `category: 'Primera A'`, `rivalTeam: 'Club A vs Club B'` |

**Home team** = first club named in the matchup (e.g. “Manquehue vs Old Girls” → Manquehue home).

**Primera A tournament** → set `category: 'Primera A'` on every clip in the match (common for Others and for UC away fixtures in Primera A).

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

Do **not** store `Presiones` on rival clips when using the COGS-style pattern: store the literal concept and let `lib/team-perspective.ts` remap at read time. Titles must start with the rival name (or a configured alias like `MQA`, `OR`).

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
- [ ] 4. Append VideoClip entries in lib/data.ts
- [ ] 5. Optional: R2 XML in lib/match-xml-catalog.ts
- [ ] 6. Optional: playlist id in db/seed.ts (if touching seed)
- [ ] 7. Verify POV remapping with a quick script
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

Find the match section in `lib/data.ts` (comment header includes playlist id). Compare playlist `youtubeId`s to existing ones.

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

### 4. Write `lib/data.ts` clips

Follow the nearest existing playlist in that team section (see [examples.md](examples.md)).

Every clip in the match shares:

- `date`, `homeTeam`, `awayTeam`, `rivalTeam`
- optional `homeGoals` / `awayGoals` / `shootoutWinner` / `category` / `place` / `collection`
- unique numeric `id` — **grep all** `id: '` in `lib/data.ts` and use max + 1 (duplicate ids break filters)
- `youtubeId`, `title` (exact YouTube title)
- `uploadedAt` ISO timestamps, descending within the match (controls grid sort)
- comment header: `// Team - Home vs Away (Playlist: PLxxxxx)` or `// Others - Primera A - …`

Place new **Others** sections near other Others blocks (end of `videoClips` array is fine). Group **UC Primera B** matches in the UC Primera B portion of the file.

Match key / storage slug (for XML / optional seed):

- Key: `date|homeTeam|awayTeam|rivalTeam` (+ `|Others` when `collection: 'Others'`)
- Slug: spaces → `_`, joined with `--` via `matchKeyToStorageSlug`

### 5. Optional match XML (R2)

If the user provides an R2 object name in bucket `clipped-xml`, add to `MATCH_XML_R2_OBJECT_BY_STORAGE_SLUG` in `lib/match-xml-catalog.ts`:

```ts
'YYYY-MM-DD--Home--Away--Rival': {
  objectKey: 'Exact R2 filename.xml',
  downloadFilename: 'Exact R2 filename.xml',
},
```

Cataloged slugs are treated as downloadable without a local `public/match-xml/` file.

### 6. Optional `db/seed.ts`

Add playlist id to `PLAYLIST_BY_MATCH_KEY` using the match key above. The whole `db/` tree is often **untracked local WIP** — updating seed is fine, but playlist commits that shipped historically included **`lib/data.ts` only** (app reads static data unless `USE_DATABASE=true`).

### 7. Verify

```bash
npx tsx -e "
import { getTeamVideos } from './lib/data'
const clips = getTeamVideos('TEAM-SLUG').filter(c => c.date === 'YYYY-MM-DD')
for (const c of clips) console.log(c.title, '->', c.gameConcept)
console.log('count:', clips.length)
"
```

For **UC Primera B**: confirm rival salidas / 50 / 75 → `Presiones` and rival ingresos → `Defensa de área`.

For **Others**: confirm clip count matches playlist (minus deleted videos).

### 8. Ship

Only when asked: commit **only** the files you changed for this import (`lib/data.ts`, and if touched `lib/team-perspective.ts`, `lib/match-xml-catalog.ts`). Then `git push` and `pnpm run deploy`. Do not include unrelated WIP (`db/`, work-window, lockfile, `.gitignore`, etc.).

## Key files

| File | Role |
|------|------|
| `lib/data.ts` | Clip catalog + team sections (**primary ship target**) |
| `lib/types.ts` | `GAME_CONCEPTS`, `VideoClip` |
| `lib/team-perspective.ts` | UC Primera B POV remaps + title aliases |
| `lib/match-xml-catalog.ts` | R2 XML object keys |
| `lib/match-keys.ts` | Match key / storage slug |
| `db/seed.ts` | Optional playlist id map (whole `db/` may be untracked WIP) |

## Additional resources

- Field hockey ES/EN title cues: [terminology.md](terminology.md)
- Real import templates & sync example: [examples.md](examples.md)
