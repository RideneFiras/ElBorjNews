import { describe, expect, it } from 'vitest';
import { browserCacheControl } from '@/lib/security/browser-cache';

describe('browserCacheControl', () => {
  it('makes browsers revalidate cached pages', () => {
    expect(browserCacheControl('s-maxage=293, stale-while-revalidate=2592000')).toBe('public, max-age=0, must-revalidate');
    expect(browserCacheControl('s-maxage=60')).toBe('public, max-age=0, must-revalidate');
  });
  it('leaves other responses alone', () => {
    expect(browserCacheControl(null)).toBeNull();
    expect(browserCacheControl('private, no-store')).toBeNull();
    expect(browserCacheControl('private, no-cache, no-store, max-age=0, must-revalidate')).toBeNull();
    expect(browserCacheControl('public, max-age=31536000, immutable')).toBeNull();
  });
});
