import { afterEach, describe, it, expect, vi } from 'vitest';
import { isRecoveryRoute, renderRecovery, type RecoverySnapshot } from '@/lib/public/recovery';
const snapshot: RecoverySnapshot = { captured_at:'2026-11-18T00:00:00Z', settings:[], categories:[{slug:'news',name_ar:'أخبار',show_in_nav:true}], articles:[{public_id:1,title:'خبر <اختبار>',subtitle:null,slug:'test',excerpt:'ملخص',category_slug:'news',category_name_ar:'أخبار',published_at:'2026-11-17T20:00:00Z',body_html:'<p>النص</p><img src="https://example.com/a.jpg"><script>bad()</script>',body_text:'النص',authors:[{name_ar:'البرج'}]}] };
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
describe('public outage recovery', () => {
  it('never intercepts admin, previews, APIs, assets or mutations', () => {
    for(const p of ['/fr/admin/login','/ar/admin','/ar/preview/article/1','/api/auth/callback','/_next/x.js','/media/x.png']) expect(isRecoveryRoute(p)).toBe(false);
    expect(isRecoveryRoute('/ar/article/1/test')).toBe(true);
  });
  it('serves escaped published headlines and a recovery timestamp', async () => {
    const r=renderRecovery(new Request('https://borj.tn/ar'),snapshot);const text=await r.text();
    expect(r.status).toBe(200);expect(text).toContain('خبر &lt;اختبار&gt;');expect(r.headers.get('X-Public-Recovery')).toBe('snapshot');
  });
  it('keeps article text and strips scripts and unavailable images', async () => {
    const r=renderRecovery(new Request('https://borj.tn/ar/article/1'),snapshot);const text=await r.text();
    expect(text).toContain('<p>النص</p>');expect(text).not.toContain('<script');expect(text).not.toContain('<img');
    expect(text).toContain('https://borj.tn/ar/article/1/test');
  });
  it('returns a real 404 for missing articles and sections', () => {
    expect(renderRecovery(new Request('https://borj.tn/ar/article/999'),snapshot).status).toBe(404);
    expect(renderRecovery(new Request('https://borj.tn/ar/section/unknown'),snapshot).status).toBe(404);
  });
  it('supports HEAD, search, feeds and a canonical root redirect', async () => {
    expect(await renderRecovery(new Request('https://borj.tn/ar',{method:'HEAD'}),snapshot).text()).toBe('');
    expect((await renderRecovery(new Request('https://borj.tn/ar/search?q=no-match'),snapshot).text())).not.toContain('href="/ar/article/1/test"');
    expect(renderRecovery(new Request('https://borj.tn/ar/rss.xml'),snapshot).headers.get('Content-Type')).toContain('application/rss+xml');
    expect(renderRecovery(new Request('https://borj.tn/'),snapshot).headers.get('Location')).toBe('https://borj.tn/ar');
  });
  it('returns to the normal application when the public API is healthy', async () => {
    vi.resetModules();
    const fetch = vi.fn().mockResolvedValue(new Response('[]')); vi.stubGlobal('fetch',fetch);
    const get = vi.fn();
    const env = { NEXT_INC_CACHE_R2_BUCKET:{get},NEXT_PUBLIC_SUPABASE_URL:'https://project.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'public-key' } as unknown as CloudflareEnv;
    const { recoveryResponse } = await import('@/lib/public/recovery');
    expect(await recoveryResponse(new Request('https://borj.tn/ar'),env)).toBeNull();
    expect(get).not.toHaveBeenCalled();
  });
  it('serves a snapshot during restrictions and reuses the health result', async () => {
    vi.resetModules();
    const fetch = vi.fn().mockResolvedValue(new Response(null,{status:402})); vi.stubGlobal('fetch',fetch);
    const get = vi.fn().mockResolvedValue({json:async()=>snapshot});
    const env = { NEXT_INC_CACHE_R2_BUCKET:{get},NEXT_PUBLIC_SUPABASE_URL:'https://project.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'public-key' } as unknown as CloudflareEnv;
    const { recoveryResponse } = await import('@/lib/public/recovery');
    expect((await recoveryResponse(new Request('https://borj.tn/ar'),env))?.status).toBe(200);
    expect((await recoveryResponse(new Request('https://borj.tn/ar/article/1'),env))?.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await recoveryResponse(new Request('https://borj.tn/fr/admin/login'),env)).toBeNull();
  });
});
