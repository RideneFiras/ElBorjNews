# Original-interface outage fallback

The templates, components, CSS, fonts and browser bundles are unchanged. Public
read models now have a fallback for the specific `exceed_cached_egress_quota`
failure. Successful live queries keep their normal path. Programming errors,
authentication failures and other errors are not masked.

The fallback reads `public-data-fallback/v1/snapshot.json` from the existing R2
bucket and supplies the original typed settings, cards, bodies and navigation
models. Only the existing public cache layer uses it. Authenticated queries,
sign-in, publishing and writes never use it. Completed public JSON can be reused
for one minute within an isolate; request objects, streams and credentials are
never retained. Next's normal five-minute data revalidation resumes live reads.

The snapshot was captured on 18 November 2026 with the PostgreSQL `anon` role,
using explicitly selected public-page fields. It contains 174 published Arabic
articles and the public settings/navigation needed by their original templates.
Drafts, user tables, private configuration, analytics and broad table exports are
excluded. The data file is private in R2 and ignored locally; it is not committed
to Git. Calendar extras and full author biographies are unavailable from this
bounded snapshot. Search falls back to a substring match over published text.

This keeps the original layout while Supabase is restricted; it does not lift
the restriction. New uploads, publishing and unavailable source pictures remain
limited. No image quality, subscription, authentication policy, schema, or UI
changes are involved. Removing the single snapshot key disables data fallback.

Validation: 90 JavaScript unit tests, TypeScript, lint, production Next/Cloudflare
build and deployment dry run. Live homepage, article, category, RSS and admin
login form return HTTP 200. Login form display is not proof that authentication
works. Production version: `8b748682-9a0b-45a6-a360-2cacc944b08f`.

For image restoration, the optional manual mode in `backup.yml` decrypts an
existing encrypted archive inside GitHub's ephemeral runner using the existing
backup secret. It extracts only allowlisted directories referenced by published
content, rejects traversal and links, and uploads only image files as a one-day
artifact. Database tables and other private files are never extracted or uploaded;
the passphrase is never exported. Normal scheduled backups remain unchanged.
