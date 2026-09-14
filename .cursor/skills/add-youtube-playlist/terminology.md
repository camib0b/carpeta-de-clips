# Field hockey terminology → game concepts

Use this to interpret YouTube clip titles (Spanish or English) into `GAME_CONCEPTS` values in `lib/types.ts`.

## Concept glossary

| Spanish (common in titles) | English | `gameConcept` | Notes |
|----------------------------|---------|---------------|-------|
| Salidas | Build-outs, exits, outlet play, playing out from the back | `Salidas` | From **rival** → UC B filter **Presiones** |
| Presiones / Presión sobre… | Press / pressure on exits or possession | `Presiones` | Already UC POV when titled this way |
| Goles / Gol / Gol a favor / Goles en contra | Goals / scoring | `Goles` | For/against still use `Goles` |
| Cortos / Cortos ofensivos / Corner cortos | Short corners (attacking) | `Corner Cortos` | Not long corners unless titled as such |
| Ingresos al área / entrando al área | Circle entries / attacking the circle | `Ingresos al área` | From **rival** → UC B **Defensa de área** |
| Defensa de área | Circle defense / defending the circle | `Defensa de área` | UC defending |
| Juego 50 yd / 50-yds / posesión 50 | Midfield / 50-yard possession | `Juego 50-yds` | From **rival** → UC B **Presiones** |
| Juego 75 yd / 75-yds | Attacking-third / 75-yard possession | `Juego 75-yds` | From **rival** → UC B **Presiones** |
| Shoot outs / penales / PS | Penalty shoot-out | `Shoot Outs` | |
| Partido completo | Full match | `Partido Completo` | |
| Flicks | Aerials / flicks | `Flicks` | |
| Pérdidas | Turnovers / losses of possession | `Pérdidas` | |

## Possession language

Titles often say “posesión”, “con pelota”, “juego N yd”, or just `50 yd` / `75 yd`.

- Midfield-ish → `Juego 50-yds`
- Higher attacking band → `Juego 75-yds`
- If unclear, prefer matching the number in the title; ask if both are absent and the concept is ambiguous

## Team / rival prefixes

Titles usually prefix the subject team:

- `UCB` / `UC B` / `UC` → UC side (do not remap as rival)
- `COGS`, `PWCC`, `MQA` (Manquehue), `OR` (Old Reds), `OGA`, etc. → that club’s actions

Configure AKA → full name aliases in `lib/team-perspective.ts` `OPPONENT_TITLE_ALIASES` so rival-prefixed titles remap correctly.

**Others library** clips are not remapped — both clubs' actions keep the literal `gameConcept` from the title.

## Playlist hygiene

- Skip YouTube titles `[Video borrado]` (deleted source).
- When syncing an existing playlist, diff by `youtubeId` and append only new entries.
- A video can reappear after deletion (e.g. `UC B Salidas` was once deleted, later re-added).

## Score / shootout metadata (not concepts)

- Regulation score → `homeGoals` / `awayGoals`
- Penalty shoot-out winner → `shootoutWinner` set to the **winning team’s full name** as used in `homeTeam`/`awayTeam` (e.g. `'UC Primera B'`). Banner and cards show compact labels like `1–1 (UCB S.O.)` via `lib/team-abbreviations.ts`.
