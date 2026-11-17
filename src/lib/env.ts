// Public configuration. Server-only secrets live in src/lib/env.server.ts.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function siteUrl(): string {
  return (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('YOUR-PROJECT-REF'));
}

/** Public media goes through the site's persistent Cloudflare cache. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/media/`;
  if (SUPABASE_URL && path.startsWith(prefix)) path = decodeURIComponent(path.slice(prefix.length));
  else if (/^https?:\/\//.test(path)) return path;
  const base = typeof window === 'undefined' ? siteUrl() : window.location.origin;
  return `${base}/media/${path.split('/').map(encodeURIComponent).join('/')}`;
}

/** Older articles contain rendered absolute storage URLs. Keep their images cached too. */
export function cachedMediaHtml(html: string): string {
  if (!SUPABASE_URL) return html;
  return html.split(`${SUPABASE_URL}/storage/v1/object/public/media/`).join(`${siteUrl()}/media/`);
}
