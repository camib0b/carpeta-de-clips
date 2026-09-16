# Match event XML files

Each file holds the full LongoMatch-style event encoding for one match (~200 KB).
Clip playlists on YouTube were built from these exports.

Production XML is served from the Cloudflare R2 bucket **clipped-xml**. The
object key is stored on the D1 `matches.r2_xml_object_key` column (see
`lib/catalog.ts`). Local copies in this folder are optional fallbacks for
development.

## File naming

Name each file `{storageSlug}.xml` where `storageSlug` is `matches.id`:

```
{date}--{homeTeam}--{awayTeam}--{rivalTeam}[--Others]
```

Spaces become `_`; non-alphanumeric characters are removed from each segment.

Example for **Others → Old Gabs vs Old Reds** (2026-05-16, Fecha 4 OGA vs OR):

```
2026-05-16--Old_Gabs--Old_Reds--Old_Gabs_vs_Old_Reds--Others.xml
```

Source export: `OGA vs OR.xml` from AVA tagging of that match (also the R2 object key).

Example for UC Sub-16 A vs PWCC on 2024-03-15:

```
2024-03-15--UC_Sub-16_A--PWCC--PWCC.xml
```

Run `pnpm run db:migrate:local && pnpm dev`, filter by that rival on the team
library page, and use **Descargar XML** to verify the download.

List every match id and R2 key:

```bash
pnpm exec tsx scripts/list-match-xml-slugs.ts
```
