# Playlist import examples

Real patterns from imports in this repo. Use as templates when adding similar matches to **D1**.

## Others library (non-UC fixtures)

Matches between two non-UC clubs. Appear on the **Others** team page (`library_id: others`).

| Match | Playlist | `rival_label` | Score | Notes |
|-------|----------|---------------|-------|-------|
| Manquehue vs Old Reds | `PLIeIXM8a6FD6P4ggVQlTwCl_mVPBhtaro` | `Manquehue vs Old Reds` | 3–1 | 8 clips; titles name each club |
| COGS vs PWCC | `PLIeIXM8a6FD67yZz5sREljuIvBAFjR8tE` | `COGS vs PWCC` | 2–3 | includes `place: 'COGS'` |
| Manquehue vs Old Girls | `PLIeIXM8a6FD5rfmpNpvpv_nt6eLgZDWpO` | `Manquehue vs Old Girls` | 2–1 | 7 clips |
| Old Girls vs Old Reds | `PLIeIXM8a6FD4-teVYLQwet8y43WrLHjue` | `Old Girls vs Old Reds` | 0–2 | 4 clips; away team won |

**Match id / storage slug:**

```
YYYY-MM-DD--Home_Club--Away_Club--Home_Club_vs_Away_Club--Others
```

**Upsert payload (Others):**

```json
{
  "match": {
    "id": "YYYY-MM-DD--Home_Club--Away_Club--Home_Club_vs_Away_Club--Others",
    "playedOn": "YYYY-MM-DD",
    "homeTeam": "Home Club",
    "awayTeam": "Away Club",
    "homeGoals": 2,
    "awayGoals": 1,
    "shootoutWinner": null,
    "place": null,
    "division": "Primera A",
    "libraryId": "others",
    "rivalLabel": "Home Club vs Away Club",
    "youtubePlaylistId": "PLxxxxx",
    "r2XmlObjectKey": "Exact R2 filename.xml"
  },
  "clips": [
    {
      "youtubeId": "…",
      "title": "Exact YouTube title",
      "gameConcept": "Goles",
      "uploadedAt": "YYYY-MM-DDTHH:00:00Z"
    }
  ]
}
```

`libraryName: 'Others'` on the TypeScript `VideoClip` shape is how the app files these clips; D1 stores that as `library_id = 'others'`.

## UC Primera B (UC is one side)

Clips appear on **UC Primera B** (`library_id: uc-primera-b`). No `--Others` suffix on the match id.

| Match | Playlist | `rival_label` | Home / away | Score |
|-------|----------|---------------|-------------|-------|
| COGS vs UC B | `PLIeIXM8a6FD5e8cplaRsW42tSVXCLX2o3` | `COGS` | COGS / UC Primera B | 2–2 |
| UC B vs PWCC | `PLIeIXM8a6FD4UdYZBex5uPQIOppjx54lX` | `PWCC` | UC Primera B / PWCC | — |
| UC B vs Old Gabs | `PLIeIXM8a6FD7nq_02FemxJmaNBo9XyuFE` | `Old Gabs` | UC Primera B / Old Gabs | 1–2 |

**Clip row (UC Primera B away fixture, COGS-style titles):**

```json
{
  "youtubeId": "…",
  "title": "COGS Salidas",
  "gameConcept": "Salidas",
  "uploadedAt": "2026-05-16T02:00:00Z"
}
```

Store literal `Salidas`; `remapGameConceptToTeamPerspective` remaps the UC B page filter to `Presiones`. Do not store `Presiones` on rival-subject clips.

Match id: `2026-05-16--COGS--UC_Primera_B--COGS`

## Syncing new videos to an existing playlist

Example: COGS vs UC B started with 7 clips; playlist later gained 3 more.

1. Re-fetch playlist ids.
2. `SELECT youtube_id FROM clips … WHERE matches.youtube_playlist_id = '…'`
3. Insert **only** missing `youtube_id`s (`ON CONFLICT DO NOTHING`).
4. Confirm POV on the UC B page for the match date.

Added in sync:

| Title | Stored concept | Filter on UC B page |
|-------|----------------|---------------------|
| UC B Salidas | `Salidas` | Salidas |
| COGS Salidas | `Salidas` | Presiones |
| COGS Juego 50 yd | `Juego 50-yds` | Presiones |

## Title → concept edge cases seen in imports

| YouTube title | `game_concept` | POV note (UC B) |
|---------------|----------------|-----------------|
| `PWCC entrando al area` | `Ingresos al área` | → Defensa de área |
| `Manquehue Salidas (Presión OR)` | `Salidas` | Others only; no UC remap |
| `Salidas COGS (Presión PWCC)` | `Salidas` | Others; already dual-team title |
| `Presión sobre salidas` | `Presiones` | UC-subject; no remap |
| `Shoot outs COGS vs UC B` | `Shoot Outs` | neutral dual-team title |
| `[Video borrado]` | — | skip; do not import |

## R2 XML → Descargar XML button

When the user names an object in bucket `clipped-xml`, set `matches.r2_xml_object_key` so the match banner shows **Descargar XML**.

| Match | `matches.id` | `r2_xml_object_key` |
|-------|--------------|---------------------|
| COGS vs UC B | `2026-05-16--COGS--UC_Primera_B--COGS` | `COGS vs UCB.xml` |
| Manquehue vs UC B | `2026-05-28--Manquehue--UC_Primera_B--Manquehue` | `MQA vs UCB.xml` |
| Old Reds vs UC B | `2026-05-30--Old_Reds--UC_Primera_B--Old_Reds` | `OR vs UCB.xml` |
| Manquehue vs Old Girls (Others) | `2026-05-16--Manquehue--Old_Girls--Manquehue_vs_Old_Girls--Others` | `MQA vs OGI.xml` |

Apply with `scripts/upsert-playlist.ts` (include `r2XmlObjectKey`) or:

```sql
UPDATE matches
SET r2_xml_object_key = 'OR vs UCB.xml'
WHERE id = '2026-05-30--Old_Reds--UC_Primera_B--Old_Reds';
```

After that, `r2_xml_object_key` is non-null → `MatchXmlDownloadButton` renders on the team page match banner.

## Commit / apply scope (typical)

```
D1 (remote): scripts/upsert-playlist.ts --remote payload.json
lib/team-perspective.ts   # only when POV rules / aliases change
```

Do **not** append clips to a TypeScript array. Do not invent scores, dates, or R2 object keys.
