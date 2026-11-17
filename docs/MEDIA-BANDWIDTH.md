# Public media bandwidth

On 17 November 2026, Supabase restricted the organisation for
`exceed_cached_egress_quota`. Public Storage returned HTTP 402 and the public
homepage returned HTTP 500. The admin login form loading did not mean that its
database or authentication API still worked. The dashboard's cycle ends on
18 November; the restriction must clear before uncached files can be fetched.

## Findings

- The media bucket contained 2,324 objects totalling 222,318,420 bytes (~222 MB).
- Uploads already produce WebP variants at 480, 960 and 1600 px and JPEG previews.
- Public images and Open Graph previews used `supabase.co` directly, bypassing
  the site's Cloudflare Worker and R2 cache.
- A last-24-hours log query found 408 successful and 2,770 restricted Storage
  requests claiming Facebook's `facebookexternalhit` user agent. User agent
  strings are not proof of identity. These logs establish repeated downloads,
  not attribution of the entire month's 12.332 GB usage.
- Supabase health advisories were empty. Security/performance advisors also
  reported existing view/function/policy and indexing findings. Those need
  context-specific review; changing RLS or SECURITY DEFINER views blindly can
  break intentionally public news views and staff checks.

## Request flow

`https://borj.tn/media/<upload path>` is intercepted in `custom-worker.ts` before
Next boots. The Worker reads an R2 copy in the existing
`el-borj-opennext-cache` bucket under `public-media/v1/`. A fresh copy is served
without contacting Supabase. A miss downloads only from this project's public
media bucket and persists the successful image. The Next route provides the
same handler for local development.

New URLs, metadata, and legacy rendered article/page image URLs use this path.
Outside image hosts are preserved. Publisher scripts may still save original
Supabase URLs; the public renderer rewrites those without modifying articles.

Copies last seven days; browser cache lifetime is one hour. They are deliberately
not marked immutable: preview backfills can replace an existing `share.jpg`.
The R2 copy is removed when an unused upload is deleted in the media library.
Previously downloaded browser copies may remain for up to one hour. If an
asset is replaced in place outside that workflow, remove its
`public-media/v1/<path>` R2 key to refresh it immediately.

The handler accepts GET/HEAD for the site's upload directory patterns only.
Cookies, authorization, query strings and redirects are not forwarded upstream.
Only image responses up to 4 MiB are persisted. Errors (including 402) are never
stored, so quota recovery is not hidden behind cached errors. Missing bindings
and upstream failures fail closed. Conditional ETags avoid unnecessary body
transfers to returning clients.

## Cost and growth

No Supabase upgrade, paid image optimiser, new bucket, or new billing plan is
required. Existing Workers/R2 usage remains subject to that account's billing
and allowances. This change is not a hard spending cap. R2 has no data-transfer
egress charge, but storage and operations have allowances and overage pricing:
https://developers.cloudflare.com/r2/pricing/

At today's inventory size, five complete weekly fills would transfer about
1.11 GB from Supabase (estimate, excluding uploads, growth, backups, old direct
links and concurrent misses). Cache hits no longer consume Supabase bandwidth.
Existing third-party copies of old direct image URLs can still request Supabase;
that traffic cannot be redirected by changing `borj.tn` alone.

Keep Supabase for database/auth and the current staff upload workflow. Watch the
next full cycle's cached and uncached egress separately, plus R2 read/write and
storage usage. Keep the existing weekly encrypted backups. If uploads and old
direct-link traffic still exceed Supabase's allowance, a separate migration of
the canonical media store and upload/delete/backup flows to R2 is the next step;
retain a verified backup before moving or deleting originals.

## Deployment and verification

1. Generate types (`pnpm cf-typegen`), then run lint, typecheck, tests,
   `pnpm test:media-runtime`, and build. The runtime check uses isolated local
   workerd/R2 storage and a simulated origin, without contacting production.
2. Deploy with the existing OpenNext/Wrangler workflow, preserving secrets and
   resource bindings. The deploy script passes `--keep-vars` to preserve
   dashboard-managed values as well. No Supabase database migration is involved.
3. After quota recovery, request a real `/media/.../share.jpg` twice. The second
   response must include `X-Media-Cache: HIT`. Inspect a fresh article's image,
   srcset and `og:image` URLs and the logo/favicon.
4. Confirm the homepage and staff login work. Before the reset, homepage 500 and
   media 503 are still expected for content not already available in the cache.

Pre-change production version recorded for rollback:
`6d4714ea-d292-4773-a90e-9bd586faad77` (Worker `www`). Rolling back code does not
remove the new R2 cache objects or roll back any external data.

Supabase quota behaviour:
https://supabase.com/docs/guides/platform/manage-your-usage/egress
