// Cache-Control for browsers on pages the Worker serves from its page cache (custom-worker.ts).
// Next.js gives cached (ISR) pages `s-maxage=…, stale-while-revalidate=2592000`: browsers
// ignore s-maxage but honour stale-while-revalidate, so they showed a saved copy for up to
// 30 days and only fetched the new one in the background. Returns the replacement value, or
// null to leave the header alone (private/admin responses, immutable static files, no cache).
export function browserCacheControl(value: string | null): string | null {
  if (!value || !/stale-while-revalidate|s-maxage/i.test(value)) return null;
  if (/private|no-store|immutable/i.test(value)) return null;
  return 'public, max-age=0, must-revalidate';
}
