import { afterEach, describe, expect, it, vi } from 'vitest';
import { mediaPath, serveMedia } from '@/lib/public/media-cache';

const path = '2026/11/6fa0900a-03d9-4aef-a904-c30154a7bb89/share.jpg';
const origin = 'https://project.supabase.co';
const request = (init?: RequestInit) => new Request(`https://borj.tn/media/${path}`, init);
function storage(saved: unknown = null) {
  const get = vi.fn().mockResolvedValue(saved);
  const put = vi.fn().mockResolvedValue({ httpEtag: '"new"' });
  // Only get/put are exercised; real binding contracts are checked by tsc and Wrangler.
  return { get, put, bucket: { get, put } as unknown as R2Bucket };
}
afterEach(() => vi.unstubAllGlobals());

describe('public media cache', () => {
  it('accepts uploads and brand assets, rejects traversal and other buckets', () => {
    expect(mediaPath(`/media/${path}`)).toBe(path);
    expect(mediaPath('/media/brand/b08e1e8b-df72-48e0-bbcc-2386c6542a83/icon-480.png')).toContain('brand/');
    for (const value of ['/media/%2e%2e/secret.jpg', '/media/%ZZ', '/media/private/file.jpg', '/media/https://example.com/x.jpg', `/media/${path}/x`]) expect(mediaPath(value)).toBeNull();
  });
  it('serves a persistent hit without any Supabase request', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const s = storage({ body: 'picture', httpEtag: '"saved"', customMetadata: { cachedAt: String(Date.now()) }, writeHttpMetadata: (h: Headers) => h.set('Content-Type', 'image/jpeg') });
    const result = await serveMedia(request(), s.bucket, origin);
    expect(await result.text()).toBe('picture');
    expect(result.headers.get('X-Media-Cache')).toBe('HIT');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('copies a successful miss once and never forwards visitor credentials or queries', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('picture', { headers: { 'content-type': 'image/jpeg' } })); vi.stubGlobal('fetch', fetch);
    const s = storage();
    const r = new Request(`https://borj.tn/media/${path}?cacheBust=123`, { headers: { Cookie: 'secret', Authorization: 'secret' } });
    const result = await serveMedia(r, s.bucket, origin);
    expect(result.status).toBe(200);
    expect(s.put.mock.calls[0]?.[0]).toBe(`public-media/v1/${path}`);
    expect(String(fetch.mock.calls[0]?.[0])).toBe(`${origin}/storage/v1/object/public/media/${path}`);
    expect(fetch.mock.calls[0]?.[1]).not.toHaveProperty('headers');
    expect(fetch.mock.calls[0]?.[1]).toHaveProperty('redirect', 'manual');
  });
  it.each([302, 402, 404, 500])('never follows redirects or caches upstream error %s', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('error', { status })));
    const s = storage(); const result = await serveMedia(request(), s.bucket, origin);
    expect(result.status).toBe(status === 404 ? 404 : 503);
    expect(result.headers.get('Cache-Control')).toBe('no-store');
    expect(s.put).not.toHaveBeenCalled();
  });
  it('rejects writes without reaching storage', async () => {
    const s = storage(); expect((await serveMedia(request({ method: 'POST' }), s.bucket, origin)).status).toBe(405);
    expect(s.get).not.toHaveBeenCalled();
  });
  it('rejects HTML and oversized responses without persisting them', async () => {
    const s = storage();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('html', { headers: { 'content-type': 'text/html' } })));
    expect((await serveMedia(request(), s.bucket, origin)).status).toBe(415);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('big', { headers: { 'content-type': 'image/jpeg', 'content-length': '9999999' } })));
    expect((await serveMedia(request(), s.bucket, origin)).status).toBe(413);
    expect(s.put).not.toHaveBeenCalled();
  });
  it('handles HEAD and conditional hits without a body', async () => {
    const s = storage({ body: 'picture', httpEtag: '"saved"', customMetadata: { cachedAt: String(Date.now()) }, writeHttpMetadata: () => {} });
    expect(await (await serveMedia(request({ method: 'HEAD' }), s.bucket, origin)).text()).toBe('');
    expect((await serveMedia(request({ headers: { 'If-None-Match': '"saved"' } }), s.bucket, origin)).status).toBe(304);
  });
  it('rechecks expired copies and stops serving a file removed upstream', async () => {
    const body = new ReadableStream({ start(controller) { controller.close(); } });
    const s = storage({ body, customMetadata: { cachedAt: String(Date.now() - 8 * 86400000) } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    expect((await serveMedia(request(), s.bucket, origin)).status).toBe(404);
    expect(s.put).not.toHaveBeenCalled();
  });
});
