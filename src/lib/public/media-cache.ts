// Public media only. Never forward cookies, credentials, query strings, or redirects.
// A bounded R2 copy avoids downloading popular images once per Cloudflare location.
const PREFIX = '/media/';
const TTL = 7 * 24 * 60 * 60;
const MAX_BYTES = 4 * 1024 * 1024;
const CONTROL = `public, max-age=3600, s-maxage=${TTL}`;

export function mediaPath(pathname: string): string | null {
  if (!pathname.startsWith(PREFIX)) return null;
  let path: string;
  try { path = decodeURIComponent(pathname.slice(PREFIX.length)); } catch { return null; }
  if (path.length > 500 || !/^[a-zA-Z0-9_./-]+\.(webp|png|jpe?g|svg|gif|ico|avif)$/.test(path)) return null;
  if (path.split('/').some((part) => !part || part === '.' || part === '..')) return null;
  // Restrict access to the application's UUID-based upload directories.
  if (!/^(?:\d{4}\/\d{2}|brand)\/[0-9a-f-]{36}\/[a-zA-Z0-9_.-]+$/.test(path)) return null;
  return path;
}

export async function serveMedia(request: Request, bucket: R2Bucket, origin: string): Promise<Response> {
  const url = new URL(request.url);
  const path = mediaPath(url.pathname);
  const fail = (status: number) => new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
  if (!path) return fail(404);
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  const key = `public-media/v1/${path}`;
  const saved = await bucket.get(key);
  const fresh = saved && Date.now() - Number(saved.customMetadata?.cachedAt ?? 0) < TTL * 1000;
  if (saved && fresh) {
    const headers = new Headers();
    saved.writeHttpMetadata(headers);
    headers.set('ETag', saved.httpEtag);
    headers.set('Cache-Control', CONTROL);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Content-Security-Policy', "default-src 'none'; sandbox");
    headers.set('X-Media-Cache', 'HIT');
    if (request.headers.get('if-none-match') === saved.httpEtag) return new Response(null, { status: 304, headers });
    return new Response(request.method === 'HEAD' ? null : saved.body, { headers });
  }
  if (saved) await saved.body.cancel();
  const source = new URL(`/storage/v1/object/public/media/${path}`, origin);
  const response = await fetch(source, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
  // Never persist an error, including quota restrictions. A reset must take effect immediately.
  if (!response.ok) return fail(response.status === 404 ? 404 : 503);
  const type = response.headers.get('content-type')?.split(';')[0] ?? '';
  if (!/^image\/(webp|png|jpeg|svg\+xml|gif|x-icon|vnd.microsoft.icon|avif)$/.test(type)) return fail(415);
  if (Number(response.headers.get('content-length')) > MAX_BYTES) return fail(413);
  const reader = response.body?.getReader();
  if (!reader) return fail(502);
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BYTES) { await reader.cancel(); return fail(413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const object = await bucket.put(key, bytes, {
    httpMetadata: { contentType: type, cacheControl: CONTROL },
    customMetadata: { cachedAt: String(Date.now()) },
  });
  const headers = new Headers({ 'Content-Type': type, 'Cache-Control': CONTROL, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox", 'X-Media-Cache': 'MISS' });
  if (object) headers.set('ETag', object.httpEtag);
  return new Response(request.method === 'HEAD' ? null : bytes, { headers });
}
