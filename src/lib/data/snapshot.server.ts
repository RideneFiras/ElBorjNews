import 'server-only';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { snapshotValue, type PublicDataSnapshot } from './snapshot-data';

// Completed public JSON only; never retain request-bound I/O objects or promises.
let decoded: { source: string; expires: number; snapshot: PublicDataSnapshot } | undefined;
export async function publicSnapshotFallback(key: string, args: unknown[]) {
  const { env } = await getCloudflareContext({async:true});
  let snapshot=decoded?.source===env.NEXT_PUBLIC_SUPABASE_URL && decoded.expires>Date.now() ? decoded.snapshot : undefined;
  if (!snapshot) {
    const object = await env.NEXT_INC_CACHE_R2_BUCKET?.get('public-data-fallback/v1/snapshot.json');
    if (!object) return {found:false} as const;
    snapshot = await object.json<PublicDataSnapshot>();
    decoded={source:env.NEXT_PUBLIC_SUPABASE_URL,expires:Date.now()+60000,snapshot};
  }
  if (!snapshot.captured_at || !Array.isArray(snapshot.cards) || !Array.isArray(snapshot.bodies)) return {found:false} as const;
  const result=snapshotValue(snapshot,key,args);
  if (result.found) console.warn('Public data snapshot used', {key,capturedAt:snapshot.captured_at});
  return result;
}
