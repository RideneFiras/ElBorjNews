# Public read-only recovery

The Supabase cached-egress restriction blocks every public API, including database
queries. A media-cache change reduces future transfer but cannot lift that restriction.

`custom-worker.ts` now checks the public API at most once per isolate per minute
for supported public reading routes. When the API is unavailable, it serves the
public snapshot in `public-recovery/v1/snapshot.json` from the existing R2 bucket.
When the check succeeds, requests return to the normal application automatically.
No database credentials or management tokens are shipped to the Worker.

The recovery edition provides Arabic headlines, article bodies, category listings,
search, pagination, RSS and sitemaps. It displays the snapshot date and a notice
that images and updates are temporarily unavailable. It intentionally omits images
that the restricted source cannot serve. It uses ordinary links instead of React
navigation, so reading does not depend on broken backend requests. Sanitization
and output escaping remain in place. Admin, preview, API and asset routes are
excluded; authentication and publishing are not restored by a public snapshot.

The initial snapshot was taken on 18 November 2026 from the management connection
with the PostgreSQL `anon` role and contained 174 public Arabic articles. Drafts,
user accounts, private configuration and analytics are not exported. The snapshot
is stored in R2, not in the repository. `scripts/export-public-recovery.sql` records
the repeatable export. Refresh it through an authenticated operator workflow if
the outage continues; the snapshot does not update itself during an outage.

Validation: 84 unit tests, TypeScript, targeted lint and final Wrangler bundle
dry run. Verify HTTP 200 and `X-Public-Recovery: snapshot` on `/ar`, a real article,
a category, search and RSS; nonexistent articles must return 404. Once Supabase
recovers, verify that the recovery header disappears and the normal media route
produces a MISS followed by a HIT.

Rollback target before this recovery change:
`971aee6f-42aa-4af2-adcb-faf2a699d992`. Rolling back code does not delete the snapshot.
Removing that single R2 snapshot key disables the recovery response. Do not purge
the whole bucket: it also contains the normal application's caches.

No subscription, billing-plan, authentication-policy or application database-schema
changes are involved. The existing Cloudflare usage allowances still apply.
