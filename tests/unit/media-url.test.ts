import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
it('routes new and previously stored Supabase image URLs through the site', async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
  vi.stubEnv('SITE_URL', 'https://borj.tn');
  vi.resetModules();
  const { mediaUrl, cachedMediaHtml } = await import('@/lib/env');
  expect(mediaUrl('brand/icon.png')).toBe('https://borj.tn/media/brand/icon.png');
  expect(mediaUrl('https://project.supabase.co/storage/v1/object/public/media/a.jpg')).toBe('https://borj.tn/media/a.jpg');
  expect(mediaUrl('https://other.example/a.jpg')).toBe('https://other.example/a.jpg');
  expect(cachedMediaHtml('<img src="https://project.supabase.co/storage/v1/object/public/media/a.jpg">')).toBe('<img src="https://borj.tn/media/a.jpg">');
});
