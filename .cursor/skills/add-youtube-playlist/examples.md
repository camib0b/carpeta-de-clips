# Playlist import examples

Real patterns from imports in this repo. Use as templates when adding similar matches.

## Others library (non-UC fixtures)

Matches between two non-UC clubs. Appear on the **Others** team page (`slug: others`).

| Match | Playlist | `rivalTeam` | Score | Notes |
|-------|----------|-------------|-------|-------|
| Manquehue vs Old Reds | `PLIeIXM8a6FD6P4ggVQlTwCl_mVPBhtaro` | `Manquehue vs Old Reds` | 3–1 | 8 clips; titles name each club |
| COGS vs PWCC | `PLIeIXM8a6FD67yZz5sREljuIvBAFjR8tE` | `COGS vs PWCC` | 2–3 | includes `place: 'COGS'` |
| Manquehue vs Old Girls | `PLIeIXM8a6FD5rfmpNpvpv_nt6eLgZDWpO` | `Manquehue vs Old Girls` | 2–1 | 7 clips |
| Old Girls vs Old Reds | `PLIeIXM8a6FD4-teVYLQwet8y43WrLHjue` | `Old Girls vs Old Reds` | 0–2 | 4 clips; away team won |

**Clip template (Others):**

```ts
{
  id: 'NN',
  youtubeId: '…',
  title: 'Exact YouTube title',
  gameConcept: 'Goles',
  collection: 'Others',
  category: 'Primera A',
  rivalTeam: 'Home Club vs Away Club',
  date: 'YYYY-MM-DD',
  homeTeam: 'Home Club',      // first name in matchup
  awayTeam: 'Away Club',
  homeGoals: 2,
  awayGoals: 1,
  uploadedAt: 'YYYY-MM-DDTHH:00:00Z',
}
```

**Seed match key** (if updating `db/seed.ts`):

```
YYYY-MM-DD|Home Club|Away Club|Home Club vs Away Club|Others
```

## UC Primera B (UC is one side)

Clips appear on **UC Primera B** (`slug: uc-primera-b`). No `collection` field.

| Match | Playlist | `rivalTeam` | Home / away | Score |
|-------|----------|-------------|---------------|-------|
| COGS vs UC B | `PLIeIXM8a6FD5e8cplaRsW42tSVXCLX2o3` | `COGS` | COGS / UC Primera B | 2–2 |
| UC B vs PWCC | `PLIeIXM8a6FD4UdYZBex5uPQIOppjx54lX` | `PWCC` | UC Primera B / PWCC | — |
| UC B vs Old Gabs | `PLIeIXM8a6FD7nq_02FemxJmaNBo9XyuFE` | `Old Gabs` | UC Primera B / Old Gabs | 1–2 |

**Clip template (UC Primera B away fixture, COGS-style titles):**

```ts
{
  id: 'NN',
  youtubeId: '…',
  title: 'COGS Salidas',           // rival prefix → POV remaps to Presiones
  gameConcept: 'Salidas',          // store literal; do not store Presiones
  category: 'Primera A',           // when user specifies tournament
  rivalTeam: 'COGS',
  date: '2026-05-16',
  homeTeam: 'COGS',
  awayTeam: 'UC Primera B',
  homeGoals: 2,
  awayGoals: 2,
  uploadedAt: '2026-05-16T02:00:00Z',
}
```

**Seed match key:**

```
YYYY-MM-DD|COGS|UC Primera B|COGS
```

## Syncing new videos to an existing playlist

Example: COGS vs UC B started with 7 clips; playlist later gained 3 more.

1. Re-fetch playlist ids.
2. Grep `lib/data.ts` for the playlist comment header.
3. Compare `youtubeId`s — only append missing entries.
4. Re-run POV verify script for the match date.

Added in sync:

| Title | Stored concept | Filter on UC B page |
|-------|----------------|---------------------|
| UC B Salidas | `Salidas` | Salidas |
| COGS Salidas | `Salidas` | Presiones |
| COGS Juego 50 yd | `Juego 50-yds` | Presiones |

## Title → concept edge cases seen in imports

| YouTube title | `gameConcept` | POV note (UC B) |
|---------------|---------------|-----------------|
| `PWCC entrando al area` | `Ingresos al área` | → Defensa de área |
| `Manquehue Salidas (Presión OR)` | `Salidas` | Others only; no UC remap |
| `Salidas COGS (Presión PWCC)` | `Salidas` | Others; already dual-team title |
| `Presión sobre salidas` | `Presiones` | UC-subject; no remap |
| `Shoot outs COGS vs UC B` | `Shoot Outs` | neutral dual-team title |
| `[Video borrado]` | — | skip; do not import |

## R2 XML → Descargar XML button

When the user names an object in bucket `clipped-xml`, catalog it so the match banner shows **Descargar XML**.

| Match | `storageSlug` | R2 `objectKey` |
|-------|---------------|----------------|
| COGS vs UC B | `2026-05-16--COGS--UC_Primera_B--COGS` | `COGS vs UCB.xml` |
| Manquehue vs UC B | `2026-05-28--Manquehue--UC_Primera_B--Manquehue` | `MQA vs UCB.xml` |
| Old Reds vs UC B | `2026-05-30--Old_Reds--UC_Primera_B--Old_Reds` | `OR vs UCB.xml` |
| Manquehue vs Old Girls (Others) | `2026-05-16--Manquehue--Old_Girls--Manquehue_vs_Old_Girls--Others` | `MQA vs OGI.xml` |

**Catalog template** (`lib/match-xml-catalog.ts`):

```ts
'2026-05-30--Old_Reds--UC_Primera_B--Old_Reds': {
  objectKey: 'OR vs UCB.xml',
  downloadFilename: 'OR vs UCB.xml',
},
```

After cataloging, `isMatchXmlAvailable(storageSlug)` is `true` → `MatchXmlDownloadButton` renders on the team page match banner. No new component work.

## Commit scope (typical)

Playlist + XML work that shipped:

```
lib/data.ts                          # always
lib/match-xml-catalog.ts             # when wiring / enabling Descargar XML
lib/team-perspective.ts              # only when POV rules / aliases change
```

Did **not** ship with playlist commits: `db/`, `package.json`, lockfile, `.gitignore` (often local WIP).
