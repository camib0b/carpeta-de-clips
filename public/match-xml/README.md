# Match event XML files

Each file holds the full LongoMatch-style event encoding for one match (~200 KB).
Clip playlists on YouTube were built from these exports.

## File naming

Name each file `{storageSlug}.xml` where `storageSlug` is derived from the match:

```
{date}--{homeTeam}--{awayTeam}--{rivalTeam}[--{collection}]
```

Spaces become `_`; non-alphanumeric characters are removed from each segment.

Example for **Others → Old Gabs vs Old Reds** (2026-05-16, Fecha 4 OGA vs OR):

```
2026-05-16--Old_Gabs--Old_Reds--Old_Gabs_vs_Old_Reds--Others.xml
```

Source export: `OGA vs OR.xml` from AVA tagging of that match.

Example for UC Sub-16 A vs PWCC on 2024-03-15:

```
2024-03-15--UC_Sub-16_A--PWCC--PWCC.xml
```

Run `pnpm dev`, filter by that rival on the team library page, and use **Descargar XML** to verify the download.

List every expected filename:

```bash
pnpm exec tsx scripts/list-match-xml-slugs.ts
```
