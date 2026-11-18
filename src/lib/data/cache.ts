import 'server-only';
import { unstable_cache } from 'next/cache';
import { publicSnapshotFallback } from './snapshot.server';

/** Every public page is fresh within 5 minutes; mutations revalidate these tags at once. */
export const REVALIDATE_SECONDS = 300;

export const TAGS = {
  settings: 'settings',
  taxonomy: 'taxonomy',
  menus: 'menus',
  pages: 'pages',
  homepage: 'homepage',
  articles: 'articles',
  authors: 'authors',
  ads: 'ads',
  stats: 'stats',
  redirects: 'redirects',
  events: 'events',
} as const;

export const ALL_TAGS = Object.values(TAGS);

export function cached<A extends unknown[], T>(fn: (...args: A) => Promise<T>, key: string, tags: string[], revalidate = REVALIDATE_SECONDS) {
  const resilient = async (...args: A): Promise<T> => {
    try { return await fn(...args); }
    catch (error) {
      if (!(error instanceof Error) || !/exceed_cached_egress_quota/.test(error.message)) throw error;
      try {
        const result=await publicSnapshotFallback(key,args);
        if (result.found) return result.value as T;
      } catch (fallbackError) {
        console.error('Public snapshot fallback failed', {key,message:fallbackError instanceof Error ? fallbackError.message : 'unknown'});
      }
      throw error;
    }
  };
  return unstable_cache(resilient, [key], { revalidate, tags });
}
